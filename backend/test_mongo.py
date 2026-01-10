from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["aerix_db"]

db.test.insert_one({"status": "connected"})

print("MongoDB Atlas connected successfully!")
