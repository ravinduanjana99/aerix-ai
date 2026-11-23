import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

uri = os.getenv("MONGODB_URI")
print(f"Testing MongoDB connection with URI: {uri[:30] if uri else 'None'}...")

try:
    client = MongoClient(uri, serverSelectionTimeoutMS=4000, connectTimeoutMS=4000)
    client.admin.command("ping")
    db = client[os.getenv("MONGODB_DB", "aerix_db")]
    db.test.insert_one({"status": "connected"})
    print("[SUCCESS] MongoDB Atlas connected successfully!")
except Exception as e:
    print(f"[ERROR] MongoDB Atlas connection failed: {e}")
    print("[INFO] Note: AERIX backend will automatically use in-memory fallback storage if MongoDB is unavailable.")
