# AERIX AI Platform

AERIX is an autonomous, multilingual AI co-pilot platform featuring **Retrieval-Augmented Generation (RAG)**, **Multi-Turn Conversational Memory**, **Live Web Search**, **Wikipedia Integration**, and natural **Sinhala (සිංහල)** interaction.

---

## 🏛️ High-Level Architecture

```text
Frontend (React 19, Modern Inter UI)
   │
   │  REST API (CORS-enabled)
   ▼
Backend (FastAPI Modular Architecture)
   ├── core/config.py               # Environment & App Settings
   ├── api/routes.py                # REST Endpoints (/chat, /history, /sessions)
   ├── services/llm_service.py      # Groq Client & Sinhala Linguistic Prompting
   ├── services/rag_service.py      # PDF Ingestion, FAISS Vector Indexing & Semantic Search
   ├── services/search_service.py   # DuckDuckGo Live Search & Wikipedia
   └── services/storage_service.py  # MongoDB Atlas with In-Memory Fallback
```

---

## 📁 Repository Structure

- [backend/](file:///d:/Projects/AERIX%20-%20AI/aerix-ai/backend): Modular FastAPI application with FAISS, Groq, DuckDuckGo, and Wikipedia services.
- [frontend/](file:///d:/Projects/AERIX%20-%20AI/aerix-ai/frontend): React frontend with modern glassmorphism styling, message editing, one-click copy, and speech synthesis.

For full setup instructions, architecture breakdown, and API documentation, please see the root [README.md](file:///d:/Projects/AERIX%20-%20AI/README.md).
