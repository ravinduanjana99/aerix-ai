import requests
from pathlib import Path
from typing import List, Optional
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader

from core.config import settings

# Initialize sentence transformer embedding model
print(f"[RAG] Loading embedding model ({settings.EMBEDDING_MODEL})...")
embedder = SentenceTransformer(settings.EMBEDDING_MODEL)


def load_knowledge_documents(doc_dir: Path) -> List[str]:
    """Load text contents from Markdown, text, and PDF documents in the specified directory."""
    documents = []
    if not doc_dir.exists():
        print(f"[RAG] Warning: Knowledge directory does not exist: {doc_dir}")
        return documents

    # 1. Load Markdown (.md) and Text (.txt) files
    for ext in ("*.md", "*.txt"):
        for file_path in doc_dir.glob(ext):
            try:
                content = file_path.read_text(encoding="utf-8")
                if content.strip():
                    documents.append(content.strip())
                    print(f"[RAG] Loaded Document: {file_path.name}")
            except Exception as e:
                print(f"[RAG] Error reading {file_path.name}: {e}")

    # 2. Load PDF (.pdf) files
    for file_path in doc_dir.glob("*.pdf"):
        try:
            reader = PdfReader(str(file_path))
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            if text.strip():
                documents.append(text.strip())
                print(f"[RAG] Loaded PDF: {file_path.name}")
        except Exception as e:
            print(f"[RAG] Error reading {file_path.name}: {e}")

    return documents


def fetch_knowledge_base_from_api() -> List[str]:
    """Optionally load documents from external REST API endpoint if configured."""
    if not settings.KB_API_URL:
        return []

    headers = {"Authorization": f"Bearer {settings.KB_API_KEY}"} if settings.KB_API_KEY else {}
    try:
        response = requests.get(settings.KB_API_URL, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()

        docs = []
        items = data.get("results", data) if isinstance(data, dict) else data
        for item in items:
            text = (
                item.get("content")
                or item.get("body")
                or item.get("text")
                or str(item)
            )
            if text:
                docs.append(text)
        print(f"[RAG] Loaded {len(docs)} documents from API: {settings.KB_API_URL}")
        return docs
    except Exception as e:
        print(f"[RAG] Note: External KB API fetch skipped ({e})")
        return []


def chunk_text(text: str, chunk_size: int = settings.CHUNK_SIZE) -> List[str]:
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]


# -----------------------------
# VECTOR INDEX BUILDER
# -----------------------------
print("[RAG] Building knowledge base...")
local_docs = load_knowledge_documents(settings.PDF_FOLDER)
api_docs = fetch_knowledge_base_from_api()
all_docs = local_docs + api_docs

if not all_docs:
    all_docs = [
        "AERIX is an autonomous multilingual synthetic AI co-pilot created by Ravindu Anjana, supporting real-time voice, code development, and multi-source knowledge synthesis."
    ]

chunks: List[str] = []
for doc in all_docs:
    chunks.extend(chunk_text(doc))

print(f"[RAG] Total chunks created: {len(chunks)}. Computing vector embeddings...")
if chunks:
    chunk_embeddings = embedder.encode(
        chunks, convert_to_numpy=True, normalize_embeddings=True
    )
    dimension = chunk_embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(chunk_embeddings)
    print(f"[RAG] FAISS index successfully created with {len(chunks)} vectors.")
else:
    index = None
    print("[RAG] Warning: No chunks found to index.")


def retrieve_relevant_chunks(query: str, k: int = 3) -> List[str]:
    """Retrieve top-k most semantically relevant text chunks from FAISS vector index."""
    if not index or not chunks:
        return []
    query_embedding = embedder.encode(
        [query], convert_to_numpy=True, normalize_embeddings=True
    )
    scores, indices = index.search(query_embedding, min(k, len(chunks)))
    return [chunks[i] for i in indices[0] if i < len(chunks)]
