from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class HistoryResponse(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]]
    created_at: Optional[str] = None
    error: Optional[str] = None


class SpeakRequest(BaseModel):
    text: str
    lang: Optional[str] = None
    gender: Optional[str] = "female"
    speed: Optional[str] = None


class Generate3DRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    language: Optional[str] = None


class Generate3DResponse(BaseModel):
    title: str
    description: str
    code: str
    prompt: str
