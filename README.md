## AERIX – AI-Powered PDF-Based Telecom Support Assistant

    AERIX is an AI-powered customer support assistant designed for telecom use cases. It leverages Retrieval-Augmented Generation (RAG) to answer user queries based on PDF knowledge sources using Groq LLaMA-4-Scout.
    The system is built with a FastAPI backend and a React-based frontend, enabling contextual, document-grounded responses with persistent chat sessions.

⚠️ UI & Platform Notice

    -This application is currently optimized for desktop screens and larger tablets.
     Mobile responsiveness is not fully implemented, and the UI may not render correctly on smaller devices.

This limitation is intentional for the current development phase and is documented clearly for transparency.

## High-Level Architecture

Frontend (React)
   |
   |  REST API (CORS-enabled)
   |
Backend (FastAPI)
   ├── Groq LLaMA-4-Scout (LLM)
   ├── FAISS (Vector Search)
   ├── SentenceTransformers (Embeddings)
   ├── MongoDB (Chat Sessions)
   └── PDF Knowledge Base


## Core Capabilities

    -PDF-based knowledge ingestion (multiple documents)
    -Semantic search using FAISS
    -Context-aware responses via Groq LLaMA-4-Scout
    -Persistent chat sessions using MongoDB
    -Session history management (list, fetch, delete)
    -Clean API separation between frontend and backen
    -Designed for local development and free-tier deployment


## Repository Structure

├── backend/
│   ├── app.py
│   ├── knowledge_base_pdfs/
│   ├── requirements.txt
│   ├── .env
│   └── README.md        # Backend-specific documentation
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md            # This file (root documentation)



## Backend Documentation

All backend-specific details — including:
    API endpoints
    Environment variables
    PDF ingestion
    FAISS indexing
    Groq integration
    MongoDB setup

    are documented in:
    backend/README.md


## Please refer to that file for backend installation and execution steps.##

## Frontend Notes

Built primarily for desktop usage
Requires the backend API to be running
Communicates via REST endpoints (/chat, /history, /sessions)
Mobile support is planned but not yet implemented
Deployment Notes
Frontend and backend can be deployed separately
Backend supports free-tier hosting (e.g., Render, Railway)
MongoDB Atlas free tier is sufficient
For local development, frontend and backend must be on the same network or use tunneling (e.g., ngrok)


## Intended Use

This project is designed to demonstrate:
RAG system design
LLM integration in production-style APIs
Vector search with document grounding
Clean separation of frontend and backend concerns
It is suitable for portfolio presentation, internships, and junior-level AI/backend roles.

## License
This project is provided for educational and demonstration purposes.