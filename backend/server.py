from fastapi import FastAPI, APIRouter
from pydantic import BaseModel
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import google.generativeai as genai
import os

app = FastAPI()
api_router = APIRouter(prefix="/api")

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Gemini
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

class Stats(BaseModel):
    total_notes: int
    quizzes_taken: int
    avg_score: float
    recent_notes: list
    tip_of_the_day: str

@api_router.get("/stats", response_model=Stats)
async def get_stats():
    total_notes = await db.notes.count_documents({})
    quizzes_taken = await db.quiz_results.count_documents({})

    # Calculate average score
    scores = await db.quiz_results.find({}, {"score": 1, "_id": 0}).to_list(1000)
    avg_score = sum(s["score"] for s in scores) / len(scores) if scores else 0

    # Recent notes
    recent_notes = await db.notes.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)

    # AI Tip of the Day
    model = genai.GenerativeModel("gemini-pro")
    tip = model.generate_content("Give a short study tip of the day.").text

    return Stats(
        total_notes=total_notes,
        quizzes_taken=quizzes_taken,
        avg_score=avg_score,
        recent_notes=recent_notes,
        tip_of_the_day=tip
    )

app.include_router(api_router)
