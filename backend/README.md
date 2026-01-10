# AERIX – Groq LLaMA-4-Scout PDF Assistant

AERIX is an AI-powered telecom customer support assistant that leverages **Retrieval-Augmented Generation (RAG)** with PDFs as knowledge sources. It uses **FastAPI** as the backend, **Groq LLaMA-4-Scout** for language modeling, **FAISS** for vector search, **MongoDB** for session storage, and **SentenceTransformers** for embedding generation.

---

⚠️ Note: This chat application is currently optimized for desktop screens and larger tablets. Mobile support is not fully implemented, and the interface may not display correctly on smaller devices.

## Features

- Load multiple PDFs as a knowledge base.
- Chunk PDF content and compute embeddings using SentenceTransformers.
- Build a FAISS vector index for semantic search.
- Groq LLaMA-4-Scout model integration for generating responses.
- MongoDB-based chat session storage.
- REST API endpoints for:
  - Chat (`/chat`)
  - Fetch session history (`/history/{session_id}`)
  - Delete session (`/history/{session_id}`)
  - List all sessions (`/sessions`)
- Context-aware responses using retrieved PDF content.
- CORS-enabled for local frontend integration.

---

## Prerequisites

- Python 3.10+
- MongoDB instance
- Groq API Key
- Local folder `knowledge_base_pdfs` with PDF files for the knowledge base.

---

## Installation

1. **Clone the repository**


2. **Create a virtual environment**
python -m venv venv

3. **Activate the virtual environment**
venv\Scripts\activate

4. **Install dependencies**
pip install -r requirements.txt

5. **Set environment variables(.env)**
GROQ_API_KEY=<your-groq-api-key>
MONGODB_URI=<your-mongodb-connection-string>
MONGODB_DB=<your-database-name>

6. **Add PDFs**
knowledge_base_pdfs/

7. **Run FastAPI server**
uvicorn app:app --reload


## Project Structure
.
├── app.py                # FastAPI backend
├── knowledge_base_pdfs/  # Folder containing PDF knowledge base
├── .env                  # Environment variables
├── requirements.txt      # Python dependencies
└── README.md             # This file
