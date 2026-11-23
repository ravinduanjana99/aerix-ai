import re
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

from core.config import settings


class ResilientStorage:
    """Manages chat sessions with MongoDB Atlas if available, falling back safely to in-memory store."""

    def __init__(self, mongo_uri: Optional[str] = None, db_name: Optional[str] = None):
        self.is_mongo = False
        self.mongo_client = None
        self.chat_collection = None
        self.memory_store: Dict[str, Dict[str, Any]] = {}

        uri = mongo_uri or settings.MONGO_URI
        db = db_name or settings.DB_NAME

        if uri and MongoClient is not None:
            try:
                print(f"[Storage] Connecting to MongoDB Atlas ({db})...")
                self.mongo_client = MongoClient(
                    uri,
                    serverSelectionTimeoutMS=2500,
                    connectTimeoutMS=2500,
                )
                self.mongo_client.admin.command("ping")
                self.chat_collection = self.mongo_client[db]["chat_sessions"]
                self.is_mongo = True
                print("[Storage] MongoDB Atlas connected successfully!")
            except Exception as e:
                print(f"[Storage] MongoDB connection unavailable ({e}). Defaulting to in-memory session storage.")
                self.is_mongo = False
        else:
            if not MongoClient:
                print("[Storage] pymongo not installed. Using in-memory session storage.")
            else:
                print("[Storage] No MONGODB_URI configured. Using in-memory session storage.")

    def create_session(self, session_id: Optional[str] = None, topic: Optional[str] = None) -> str:
        sid = session_id.strip() if session_id and session_id.strip() else str(uuid.uuid4())
        session_doc = {
            "session_id": sid,
            "topic": topic or "New Chat",
            "title": topic or "New Chat",
            "messages": [],
            "created_at": datetime.utcnow(),
        }
        if self.is_mongo and self.chat_collection is not None:
            try:
                self.chat_collection.update_one(
                    {"session_id": sid},
                    {"$setOnInsert": session_doc},
                    upsert=True,
                )
            except Exception as e:
                print(f"[Storage] Warning: MongoDB session create failed: {e}")

        if sid not in self.memory_store:
            self.memory_store[sid] = session_doc
        return sid

    def save_message(self, session_id: str, role: str, content: str):
        msg = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow(),
        }

        # Topic extraction on first user prompt
        topic_update = {}
        if role == "user":
            existing = self.get_session(session_id)
            if not existing or not existing.get("topic") or existing.get("topic") == "New Chat":
                # Clean up prompt into an articulate title
                raw_line = content.split("\n")[0].strip()
                cleaned_line = re.sub(r"[#*_`~]+", "", raw_line).strip()
                if len(cleaned_line) > 36:
                    cleaned_line = cleaned_line[:36].rsplit(" ", 1)[0] + "..."
                topic_title = cleaned_line or "New Conversation"
                topic_update = {"topic": topic_title, "title": topic_title}

        if self.is_mongo and self.chat_collection is not None:
            try:
                update_query: Dict[str, Any] = {"$push": {"messages": msg}}
                if topic_update:
                    update_query["$set"] = topic_update
                    update_query["$setOnInsert"] = {
                        "session_id": session_id,
                        "created_at": datetime.utcnow(),
                    }
                else:
                    update_query["$setOnInsert"] = {
                        "session_id": session_id,
                        "created_at": datetime.utcnow(),
                    }

                self.chat_collection.update_one(
                    {"session_id": session_id},
                    update_query,
                    upsert=True,
                )
            except Exception as e:
                print(f"[Storage] Warning: MongoDB save message failed: {e}")

        # Update in-memory cache
        if session_id not in self.memory_store:
            self.memory_store[session_id] = {
                "session_id": session_id,
                "topic": topic_update.get("topic", "New Chat"),
                "title": topic_update.get("title", "New Chat"),
                "messages": [],
                "created_at": datetime.utcnow(),
            }
        elif topic_update:
            self.memory_store[session_id]["topic"] = topic_update["topic"]
            self.memory_store[session_id]["title"] = topic_update["title"]

        self.memory_store[session_id]["messages"].append(msg)

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        if self.is_mongo and self.chat_collection is not None:
            try:
                doc = self.chat_collection.find_one({"session_id": session_id}, {"_id": 0})
                if doc:
                    return doc
            except Exception as e:
                print(f"[Storage] Warning: MongoDB get session failed: {e}")

        return self.memory_store.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        deleted = False
        if self.is_mongo and self.chat_collection is not None:
            try:
                res = self.chat_collection.delete_one({"session_id": session_id})
                if res.deleted_count > 0:
                    deleted = True
            except Exception as e:
                print(f"[Storage] Warning: MongoDB delete session failed: {e}")

        if session_id in self.memory_store:
            del self.memory_store[session_id]
            deleted = True
        return deleted

    def clear_all(self) -> int:
        """Clear all chat sessions across MongoDB and in-memory fallback."""
        count = 0
        if self.is_mongo and self.chat_collection is not None:
            try:
                res = self.chat_collection.delete_many({})
                count = res.deleted_count
            except Exception as e:
                print(f"[Storage] Warning: MongoDB clear failed: {e}")
        self.memory_store.clear()
        return count

    def list_sessions(self) -> List[Dict[str, Any]]:
        sessions = []
        if self.is_mongo and self.chat_collection is not None:
            try:
                cursor = self.chat_collection.find(
                    {},
                    {"_id": 0, "session_id": 1, "topic": 1, "title": 1, "created_at": 1, "messages": {"$slice": 1}},
                ).sort("created_at", -1)
                for doc in cursor:
                    created_at = doc.get("created_at")
                    created_at_str = (
                        created_at.isoformat()
                        if isinstance(created_at, datetime)
                        else str(created_at or "")
                    )
                    topic = doc.get("topic") or doc.get("title")
                    if not topic:
                        first_msg = doc.get("messages", [])
                        preview = first_msg[0].get("content", "") if first_msg else ""
                        topic = (preview[:32] + "...") if len(preview) > 32 else (preview or "New Chat")

                    sessions.append({
                        "session_id": doc.get("session_id"),
                        "created_at": created_at_str,
                        "title": topic,
                        "topic": topic,
                    })
                return sessions
            except Exception as e:
                print(f"[Storage] Warning: MongoDB list sessions failed: {e}")

        # Fallback to in-memory store
        for sid, data in sorted(
            self.memory_store.items(),
            key=lambda item: item[1].get("created_at") or datetime.min,
            reverse=True,
        ):
            created_at = data.get("created_at")
            created_at_str = (
                created_at.isoformat()
                if isinstance(created_at, datetime)
                else str(created_at or "")
            )
            topic = data.get("topic") or data.get("title")
            if not topic:
                first_msg = data.get("messages", [])
                preview = first_msg[0].get("content", "") if first_msg else ""
                topic = (preview[:32] + "...") if len(preview) > 32 else (preview or "New Chat")

            sessions.append({
                "session_id": sid,
                "created_at": created_at_str,
                "title": topic,
                "topic": topic,
            })
        return sessions


# Singleton storage instance
storage = ResilientStorage()
