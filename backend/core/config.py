import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from backend root
load_dotenv(BASE_DIR / ".env")
load_dotenv()


class Settings:
    PROJECT_NAME: str = "AERIX – AI Co-Pilot & Support Assistant"
    VERSION: str = "2.0.0"
    BASE_DIR: Path = BASE_DIR

    # Groq Configuration
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    FALLBACK_MODELS: list = [
        os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"),
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
    ]

    # MongoDB Configuration
    MONGO_URI: str = os.getenv("MONGODB_URI", "")
    DB_NAME: str = os.getenv("MONGODB_DB", "aerix_db")

    # Knowledge Base / RAG Configuration
    PDF_FOLDER: Path = BASE_DIR / "knowledge_base_pdfs"
    CHUNK_SIZE: int = 500
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Optional External Knowledge Base API
    KB_API_URL: str = os.getenv("KB_API_URL", "")
    KB_API_KEY: str = os.getenv("KB_API_KEY", "")

    # ElevenLabs Neural Voice Configuration (English Primary)
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
    ELEVENLABS_MODEL_ID: str = os.getenv("ELEVENLABS_MODEL_ID", "eleven_flash_v2_5")

    # Gemini Multimodal Live API Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_LIVE_MODEL: str = os.getenv(
        "GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"
    )

    # CORS Allowed Origins
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]


settings = Settings()
