from fastapi import FastAPI
from pydantic import BaseModel
from pathlib import Path
import faiss
import numpy as np
import os
import uuid
from datetime import datetime
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
from groq import Groq
from dotenv import load_dotenv
from pymongo import MongoClient
from fastapi.middleware.cors import CORSMiddleware

# -----------------------------
# ENV & CONFIG
# -----------------------------
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
PDF_FOLDER = BASE_DIR / "knowledge_base_pdfs"
CHUNK_SIZE = 500
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not found")

if not MONGO_URI:
    raise RuntimeError("MONGODB_URI not found")

# -----------------------------
# INITIALIZE CLIENTS
# -----------------------------
groq_client = Groq(api_key=GROQ_API_KEY)
embedder = SentenceTransformer(EMBEDDING_MODEL)

mongo_client = MongoClient(MONGO_URI)
db = mongo_client[DB_NAME]
chat_collection = db["chat_sessions"]

# -----------------------------
# LOAD PDFS
# -----------------------------
def load_pdfs(pdf_folder: Path):
    docs = []
    for pdf_file in pdf_folder.glob("*.pdf"):
        reader = PdfReader(str(pdf_file))
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        docs.append(text)
    return docs

def chunk_text(text, chunk_size=CHUNK_SIZE):
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

print("Loading PDFs...")
pdf_texts = load_pdfs(PDF_FOLDER)

chunks = []
for text in pdf_texts:
    chunks.extend(chunk_text(text))

print(f"Total chunks loaded: {len(chunks)}")

# -----------------------------
# VECTOR STORE (FAISS)
# -----------------------------
print("Computing embeddings...")
chunk_embeddings = embedder.encode(
    chunks,
    convert_to_numpy=True,
    normalize_embeddings=True
)

dimension = chunk_embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)
index.add(chunk_embeddings)

print("FAISS index ready")

# -----------------------------
# FASTAPI
# -----------------------------
app = FastAPI(title="AERIX – Groq LLaMA-4-Scout PDF Assistant")

# -----------------------------
# CORS CONFIGURATION
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# MODELS
# -----------------------------
class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    reply: str
    session_id: str

# -----------------------------
# RAG UTILITIES
# -----------------------------
def retrieve_relevant_chunks(query: str, k: int = 4):
    query_embedding = embedder.encode(
        [query],
        convert_to_numpy=True,
        normalize_embeddings=True
    )
    scores, indices = index.search(query_embedding, k)
    return [chunks[i] for i in indices[0]]

def build_prompt(user_message: str, context_chunks: list[str]) -> list[dict]:
    context = "\n\n".join(context_chunks)

    return [
        {
            "role": "system",
            "content": (
                "You are AERIX, an AI-powered telecom customer support assistant. "
                "DO NOT invent or mention any company names, brands, or operators. "
                "DO NOT refer to any telecom provider by name. "
                "Provide answers in a neutral, generic telecom support tone. "
                "Use the provided context when relevant. "
                "If the answer is not in the context, respond using general telecom knowledge. "
                "This is a demo environment with synthetic data only."
            )
        },
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion:\n{user_message}"
        }
    ]


# -----------------------------
# MONGODB HELPERS
# -----------------------------
def create_session():
    session_id = str(uuid.uuid4())
    chat_collection.insert_one({
        "session_id": session_id,
        "messages": [],
        "created_at": datetime.utcnow()
    })
    return session_id

def save_message(session_id: str, role: str, content: str):
    chat_collection.update_one(
        {"session_id": session_id},
        {
            "$push": {
                "messages": {
                    "role": role,
                    "content": content,
                    "timestamp": datetime.utcnow()
                }
            }
        }
    )

# -----------------------------
# CHAT ENDPOINT
# -----------------------------
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):

    # Create or reuse session
    if req.session_id:
        session_id = req.session_id
    else:
        session_id = create_session()

    # Save user message
    save_message(session_id, "user", req.message)

    # RAG
    relevant_chunks = retrieve_relevant_chunks(req.message)
    messages = build_prompt(req.message, relevant_chunks)

    completion = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=400,
        top_p=0.9
    )

    reply = completion.choices[0].message.content.strip()

    # Save assistant reply
    save_message(session_id, "assistant", reply)

    return ChatResponse(reply=reply, session_id=session_id)

# -----------------------------
# FETCH CHAT HISTORY
# -----------------------------
@app.get("/history/{session_id}")
def get_history(session_id: str):
    session = chat_collection.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    if not session:
        return {"error": "Session not found"}
    return session

@app.delete("/history/{session_id}")
def reset_history(session_id: str):
    result = chat_collection.delete_one({"session_id": session_id})
    if result.deleted_count == 0:
        return {"error": "Session not found"}
    return {"message": "Chat history cleared"}

@app.get("/sessions")
def list_sessions():
    sessions = chat_collection.find(
        {},
        {"_id": 0, "session_id": 1, "created_at": 1}
    ).sort("created_at", -1)

    return list(sessions)
