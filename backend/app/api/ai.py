from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form

from app.utils.utf8_utils import ensure_utf8
from app.dependencies import get_current_user, get_optional_current_user
from app.models.user import User
from app.schemas.ai import (
    AIProcessRequest,
    AIProcessResponse,
    AISuggestionResponse,
    AIChatRequest,
    AIChatResponse,
)
from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["AI Engine"])


# ============================================================
# LANGGRAPH MULTI-TURN CHAT ORCHESTRATOR
# ============================================================

@router.post("/chat", response_model=AIChatResponse)
def orchestrator_chat(
    req: AIChatRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Multi-turn conversational chat with AI Orchestrator powered by LangGraph state machine.
    Maintains conversational memory, guides users through clarifying questions, and compiles execution commands.
    """
    result = ai_service.chat(
        message=req.message,
        session_id=req.session_id or "default_session",
        media_type=req.media_type or "image",
        media_url=req.media_url,
        thumbnail_url=req.thumbnail_url,
        history=req.history
    )
    return AIChatResponse(**result)


# ============================================================
# EXISTING AI ORCHESTRATOR
# ============================================================

@router.post("/process", response_model=AIProcessResponse)
def process_ai_editing(
    req: AIProcessRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Submit an AI natural language editing job powered by Gemini AI and LangGraph."""
    result = ai_service.process_ai_request(
        req.media_id,
        req.media_type,
        req.prompt,
    )

    return AIProcessResponse(**result)


# ============================================================
# EXISTING AI SUGGESTIONS
# ============================================================

@router.get(
    "/suggest/{media_id}",
    response_model=AISuggestionResponse,
)
def get_ai_suggestions(
    media_id: str,
    media_type: str = "image",
    current_user: User = Depends(get_current_user),
):
    """Get smart editing suggestions from Gemini Vision."""
    result = ai_service.get_suggestions(
        media_id,
        media_type,
    )

    return AISuggestionResponse(**result)


# ============================================================
# GENERATIVE FILL
# ============================================================

@router.post("/generative-fill")
async def generative_fill(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    """
    Generate an AI-edited image using Gemini image generation.

    Frontend sends:
        image = original image
        prompt = user's Generative Fill instruction

    Example:
        prompt = "Add realistic black sunglasses"
    """

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file.",
        )

    if not prompt.strip():
        raise HTTPException(
            status_code=400,
            detail="Generative Fill prompt cannot be empty.",
        )

    try:
        image_bytes = await image.read()

        result = await ai_service.generative_fill(
            image_bytes=image_bytes,
            filename=image.filename or "image.png",
            content_type=image.content_type,
            prompt=prompt.strip(),
        )

        return result

    except Exception as e:
        print(f"[GenerativeFill] Error: {e}")

        raise HTTPException(
            status_code=500,
            detail=f"Generative Fill failed: {str(e)}",
        )


from typing import Optional
from app.dependencies import get_current_user, get_optional_current_user

# ============================================================
# IMAGE TO VIDEO PIPELINE
# ============================================================

@router.post("/image-to-video")
async def image_to_video(
    image: UploadFile = File(...),
    prompt: str = Form("Animate this photo with cinematic camera motion and dynamic lighting"),
    motion_style: str = Form("cinematic_pan_zoom"),
    duration: float = Form(4.0),
    bgm: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Synthesizes an MP4 video from an uploaded image file using the Image-to-Video AI pipeline.
    Fully UTF-8 compliant for emojis, special characters, and BGM tags.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file.",
        )

    try:
        image_bytes = await image.read()
        raw_prompt = ensure_utf8(prompt.strip() if prompt else "Animate this photo with cinematic camera motion")
        if bgm and "[BGM:" not in raw_prompt:
            raw_prompt = f"{raw_prompt} [BGM: {ensure_utf8(bgm)}]"

        result = await ai_service.image_to_video(
            image_bytes=image_bytes,
            filename=image.filename or "photo.png",
            content_type=image.content_type,
            prompt=raw_prompt,
            motion_style=motion_style,
            duration=duration,
        )

        return result

    except Exception as e:
        print(f"[ImageToVideo] Error: {ensure_utf8(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Image-to-Video generation failed: {str(e)}",
        )


# ============================================================
# JOB STATUS & CANCELLATION
# ============================================================


@router.get("/jobs/{job_id}")
def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """Retrieve in-flight or completed AI job status."""
    from app.main import ai_queue_worker

    job = ai_queue_worker.active_jobs.get(job_id)
    if not job:
        raise HTTPException(
            status_code=404,
            detail=f"Job '{job_id}' not found.",
        )
    return job


@router.post("/jobs/{job_id}/cancel")
def cancel_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """Explicitly cancel an AI agent job."""
    from app.main import ai_queue_worker

    canceled = ai_queue_worker.cancel_job(job_id)
    if not canceled:
        raise HTTPException(
            status_code=404,
            detail=f"Job '{job_id}' not found or already completed.",
        )
    return {
        "status": "canceled",
        "message": f"Job '{job_id}' successfully canceled.",
    }