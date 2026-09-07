from fastapi import FastAPI, APIRouter
from pydantic import BaseModel
import google.generativeai as genai
import os

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Load Gemini API key
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

class ChatInput(BaseModel):
    message: str

@api_router.post("/chat")
async def chat(input: ChatInput):
    model = genai.GenerativeModel("gemini-pro")
    response = model.generate_content(input.message)
    return {"reply": response.text}

app.include_router(api_router)
