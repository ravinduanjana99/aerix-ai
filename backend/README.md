# AERIX – Modular FastAPI Backend

The AERIX backend is a modular **FastAPI** service engineered for high-performance AI interactions, combining multi-turn conversational memory, PDF-based semantic RAG via FAISS, real-time web search via DuckDuckGo, and encyclopedic facts from Wikipedia.

---

## 🏗️ Architecture & Modules

The backend is organized into decoupled layers:

```text
backend/
├── app.py                      # Application entrypoint & CORS middleware setup
├── core/
│   ├── __init__.py
│   └── config.py               # Pydantic Settings, environment variables & paths
├── api/
│   ├── __init__.py
│   ├── schemas.py              # Pydantic validation models (ChatRequest, ChatResponse)
│   └── routes.py               # REST API endpoints (/chat, /history, /sessions, /health)
├── services/
│   ├── __init__.py
│   ├── storage_service.py      # Resilient storage (MongoDB Atlas with in-memory fallback)
│   ├── rag_service.py          # PDF loader, SentenceTransformers embeddings & FAISS vector index
│   ├── search_service.py       # Live DuckDuckGo web search & Wikipedia lookup
│   └── llm_service.py          # Groq API client, model fallback chain & Sinhala prompt synthesis
├── knowledge_base_pdfs/        # Domain PDF documents
├── requirements.txt            # Python dependencies
└── .env                        # Local environment configuration
```

---

## ⚡ Features

1. **Tri-Source Knowledge Retrieval**:
   - **Local PDFs**: Chunks and indexes PDFs using `sentence-transformers/all-MiniLM-L6-v2` and `faiss-cpu`.
   - **DuckDuckGo Search (`ddgs`)**: Live web search with zero API key requirement.
   - **Wikipedia API (`wikipedia`)**: Detailed encyclopedic summaries for factual inquiries.
2. **Multi-Turn Session Memory**:
   - Maintains rolling conversational memory (`last 10 turns`) so follow-up queries, pronouns, and corrections work seamlessly.
3. **Sinhala & Singlish Fluency**:
   - Explicit prompt instructions for natural Subject-Object-Verb (SOV) Sinhala grammar, respectful tone, and clear technical terms.
4. **Resilient Session Storage**:
   - Automatically connects to **MongoDB Atlas** when configured, and falls back to an **in-memory thread-safe store** if offline.

---

## 🚀 Quickstart

1. **Activate Virtual Environment**:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

2. **Install Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

3. **Run Server**:
   ```powershell
   uvicorn app:app --reload --port 8000
   ```

4. **Verify Health**:
   Open `http://localhost:8000/health` or browse interactive documentation at `http://localhost:8000/docs`.
