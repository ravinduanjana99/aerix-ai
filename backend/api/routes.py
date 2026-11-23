import io
import re
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from core.config import settings
from api.schemas import ChatRequest, ChatResponse, HistoryResponse, SpeakRequest, Generate3DRequest, Generate3DResponse
from services.storage_service import storage
from services.rag_service import retrieve_relevant_chunks, chunks
from services.search_service import search_duckduckgo, search_wikipedia
from services.llm_service import call_groq_with_fallback, build_conversation_messages
from services.voice_service import synthesize_speech
from services.three_generator_service import generate_3d_scene, PRESET_SCENES

router = APIRouter()


@router.get("/")
@router.get("/health")
def health_check():
    """Service health and capability status."""
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "groq_model": settings.GROQ_MODEL,
        "storage": "mongodb" if storage.is_mongo else "in-memory-fallback",
        "indexed_chunks": len(chunks),
    }


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Handle conversational chat requests with multi-source knowledge retrieval and session memory."""
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    session_id = storage.create_session(req.session_id)

    # 1. Fetch previous session history BEFORE appending this turn (to avoid duplicates)
    session_data = storage.get_session(session_id)
    history_messages = session_data.get("messages", []) if session_data else []

    # 2. Multi-Source Knowledge Retrieval
    relevant_chunks = retrieve_relevant_chunks(req.message, k=3)
    web_results = search_duckduckgo(req.message, max_results=2)
    wiki_info = search_wikipedia(req.message)

    # Assemble comprehensive multi-source context
    context_sections = []
    if relevant_chunks:
        context_sections.append("### INTERNAL DOCUMENTS / LOCAL KNOWLEDGE:\n" + "\n\n".join(relevant_chunks))
    if wiki_info:
        context_sections.append("### WIKIPEDIA KNOWLEDGE:\n" + wiki_info)
    if web_results:
        context_sections.append("### LIVE WEB SEARCH (DUCKDUCKGO):\n" + "\n\n".join(web_results))

    context = (
        "\n\n".join(context_sections)
        if context_sections
        else "No specific external context found."
    )

    # 3. Build Full Conversation Prompt
    llm_messages = build_conversation_messages(
        user_message=req.message,
        context=context,
        history=history_messages,
        language=req.language,
    )

    # 4. Save User Message to Storage
    storage.save_message(session_id, "user", req.message)

    # 5. Generate LLM Reply
    try:
        reply = call_groq_with_fallback(llm_messages)
    except Exception as e:
        print(f"[Chat] Groq completion failed: {e}")
        reply = (
            "I apologize, but I am having trouble connecting to my language processing service right now. "
            "Please try again in a moment."
        )

    # 6. Save Assistant Response to Storage
    storage.save_message(session_id, "assistant", reply)
    return ChatResponse(reply=reply, session_id=session_id)


@router.get("/history/{session_id}")
def get_history(session_id: str):
    """Retrieve full message history for a given session."""
    session = storage.get_session(session_id)
    if not session:
        return {"session_id": session_id, "messages": [], "error": "Session not found"}

    raw_messages = session.get("messages", [])
    formatted_messages = []
    for idx, msg in enumerate(raw_messages):
        role = msg.get("role", "assistant")
        sender = "user" if role == "user" else "bot"
        content = msg.get("content", "")
        ts = msg.get("timestamp")
        ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts or "")

        formatted_messages.append({
            "id": f"{session_id}_{idx}",
            "sender": sender,
            "role": role,
            "text": content,
            "content": content,
            "timestamp": ts_str,
        })

    created_at = session.get("created_at")
    created_at_str = (
        created_at.isoformat() if isinstance(created_at, datetime) else str(created_at or "")
    )

    return {
        "session_id": session_id,
        "messages": formatted_messages,
        "created_at": created_at_str,
    }


@router.delete("/history/{session_id}")
def reset_history(session_id: str):
    """Delete a session from storage."""
    deleted = storage.delete_session(session_id)
    if not deleted:
        return {"message": "Session already cleared or not found"}
    return {"message": "Chat history cleared"}


@router.get("/sessions")
def list_sessions():
    """List all available conversation sessions."""
    return storage.list_sessions()


@router.delete("/sessions")
@router.post("/sessions/clear")
def clear_all_sessions():
    """Clear all chat history from MongoDB Atlas and memory store."""
    count = storage.clear_all()
    return {"status": "success", "message": f"Cleared {count} sessions from database"}


@router.post("/voice/speak")
@router.get("/voice/speak")
async def speak_text(
    text: Optional[str] = None, 
    lang: Optional[str] = None, 
    gender: Optional[str] = "female",
    speed: Optional[str] = None,
    req: Optional[SpeakRequest] = None
):
    """
    Generate high-clarity Sri Lankan Sinhala / Conversational English neural speech
    with natural comma and full-stop pauses and authentic cadence.
    """
    target_text = req.text if (req and req.text) else text
    if not target_text or not target_text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    target_lang = req.lang if (req and req.lang) else lang
    if not target_lang:
        # Auto-detect Sinhala Unicode characters
        has_sinhala = bool(re.search(r"[\u0D80-\u0DFF]", target_text))
        target_lang = "si" if has_sinhala else "en"

    target_gender = req.gender if (req and req.gender) else gender or "female"
    target_speed = req.speed if (req and req.speed) else speed

    try:
        audio_bytes = await synthesize_speech(
            text=target_text,
            lang=target_lang,
            gender=target_gender,
            speed=target_speed
        )
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )
    except Exception as e:
        print(f"[TTS Error] {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@router.get("/3d/presets")
def get_3d_presets():
    """Returns curated Three.js 3D scene presets."""
    return [
        {
            "id": p["id"],
            "title": p["title"],
            "description": p["description"],
            "prompt": p["prompt"],
            "code": p["code"]
        }
        for p in PRESET_SCENES
    ]


@router.post("/3d/generate", response_model=Generate3DResponse)
def generate_3d(req: Generate3DRequest):
    """Generate dynamic Three.js WebGL scene code based on user prompt."""
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    result = generate_3d_scene(req.prompt, language=req.language or "en")
    return Generate3DResponse(
        title=result["title"],
        description=result["description"],
        code=result["code"],
        prompt=result["prompt"]
    )


