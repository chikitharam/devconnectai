from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Response
from sqlalchemy.orm import Session
import httpx
import os
import uuid
import subprocess
import json
import openai
from dotenv import load_dotenv
from pydantic import ValidationError

import models
import schemas
from database import get_db
from auth import require_role

load_dotenv()
router = APIRouter(prefix="/ai", tags=["AI"])

GNANI_API_KEY = os.getenv("GNANI_API_KEY")

# Initialize AI Client (Groq/OpenAI compatible)
client = openai.OpenAI(
    api_key=os.getenv("EVON_API_KEY"),
    base_url=os.getenv("EVON_BASE_URL")
)
EVON_MODEL = os.getenv("EVON_MODEL_ID")

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_role("customer"))
):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")

    if not GNANI_API_KEY:
        raise HTTPException(status_code=500, detail="GNANI_API_KEY is missing. Check your .env file.")

    temp_input = f"temp_{uuid.uuid4()}.webm"
    temp_output = f"temp_{uuid.uuid4()}.wav"

    try:
        with open(temp_input, "wb") as buffer:
            buffer.write(await file.read())

        try:
            command = [
                r"C:\ffmpeg\bin\ffmpeg.exe",
                "-i", temp_input,
                "-acodec", "pcm_s16le",
                "-ar", "16000",
                "-ac", "1",
                temp_output,
                "-y"
            ]
            subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail="FFmpeg not found. Please check the path.")
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"Audio conversion failed: {e.stderr.decode()}")

        with open(temp_output, "rb") as f:
            audio_content = f.read()

        files = {"audio_file": ("recording.wav", audio_content, "audio/wav")}
        data = {"language_code": "en-IN", "model": "prisma-v2.5"}
        headers = {"X-API-Key-ID": GNANI_API_KEY}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    "https://api.vachana.ai/stt/v3",
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                return {
                    "success": True,
                    "transcript": result.get("transcript", ""),
                    "request_id": result.get("request_id")
                }
            except httpx.HTTPStatusError as e:
                raise HTTPException(status_code=e.response.status_code, detail=f"Gnani API Error: {e.response.text}")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Connection Error: {str(e)}")

    finally:
        try:
            if os.path.exists(temp_input): os.remove(temp_input)
            if os.path.exists(temp_output): os.remove(temp_output)
        except PermissionError:
            pass

# --- DAY 12: CLARIFICATION QUESTIONS ---
@router.post("/clarify", response_model=schemas.ClarificationQuestions)
async def generate_clarification_questions(
    request: schemas.AnalyzeProjectRequest,
    current_user: models.User = Depends(require_role("customer"))
):
    system_prompt = """
    You are an expert software architect. The customer has provided a vague project idea.
    Identify what is missing and generate 3 to 5 specific, highly relevant clarifying questions.
    
    Return ONLY a JSON object with this exact schema:
    {
      "questions": ["Question 1?", "Question 2?", "Question 3?"]
    }
    """
    user_prompt = f"Project Idea:\n{request.description}"

    try:
        response = client.chat.completions.create(
            model=EVON_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )
        raw_content = response.choices[0].message.content
        parsed_json = json.loads(raw_content)
        return parsed_json
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

# --- UPDATED ANALYZE PROJECT ---
@router.post("/analyze-project", response_model=schemas.AIAnalysisResult)
async def analyze_project(
    request: schemas.AnalyzeProjectRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer"))
):
    project = db.query(models.Project).filter(
        models.Project.project_id == request.project_id,
        models.Project.customer_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    system_prompt = """
    You are an expert software architect. Analyze the following project description and return a JSON object.
    Do not include any markdown formatting (like ```json), just return the raw JSON object.
    
    The JSON must strictly follow this schema:
    {
      "project_title": "A short title",
      "project_overview": "A 1-2 sentence summary",
      "functional_requirements": ["List", "of", "features"],
      "non_functional_requirements": ["Security", "Performance"],
      "required_skills": ["React", "Python"],
      "suggested_technologies": ["React", "FastAPI", "MySQL"],
      "complexity": "Low, Medium, or High",
      "suggested_modules": [
        {"module_name": "User Management", "description": "Registration and login"},
        {"module_name": "Payment System", "description": "Process payments"}
      ]
    }
    """
    
    user_prompt = f"Project Idea:\n{request.description}\n\n"
    
    if request.clarification_qa:
        user_prompt += "Additional Clarifications Provided by Customer:\n"
        for qa in request.clarification_qa:
            user_prompt += f"Q: {qa.question}\nA: {qa.answer}\n"
        user_prompt += "\nPlease update the analysis based on these new details."

    try:
        response = client.chat.completions.create(
            model=EVON_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        raw_content = response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Connection Error: {str(e)}")

    try:
        parsed_json = json.loads(raw_content)
        validated_result = schemas.AIAnalysisResult(**parsed_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON format. Error: {str(e)}")

    project.ai_analysis = validated_result.model_dump()
    db.commit()
    db.refresh(project)

    return validated_result

@router.post("/speak-summary")
async def speak_summary(
    payload: dict, # Expecting {"text": "..."}
    current_user: models.User = Depends(require_role("customer"))
):
    text_to_speak = payload.get("text")
    if not text_to_speak:
        raise HTTPException(status_code=400, detail="Text is required")

    # Gnani Timbre REST API configuration
    url = "https://api.vachana.ai/api/v1/tts/inference"
    headers = {
        "X-API-Key-ID": GNANI_API_KEY, # Using the same key as STT
        "Content-Type": "application/json"
    }
    data = {
        "text": text_to_speak,
        "voice": "Nalini",           # Default voice from docs
        "model": "timbre-v2.5",      # Recommended model
        "language": "en-IN",         # English (India) - change if needed
        "speed": 1.0,
        "audio_config": {
            "sample_rate": 48000,
            "num_channels": 1,
            "sample_width": 2,
            "encoding": "linear_pcm",
            "container": "wav"
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            # Requesting audio from Gnani
            response = await client.post(url, headers=headers, json=data, timeout=30.0)
            response.raise_for_status()
            
            # Return the binary audio stream to the frontend
            return Response(content=response.content, media_type="audio/wav")
            
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Timbre API Error: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Connection Error: {str(e)}")
