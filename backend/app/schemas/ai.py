from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AIProcessRequest(BaseModel):
    media_id: str
    media_type: str  # 'image' or 'video'
    prompt: str
    strict_facial_consistency: Optional[bool] = False
    facial_ref_url: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class AIProcessResponse(BaseModel):
    job_id: str
    status: str
    message: str
    planned_steps: Optional[List[Dict[str, Any]]] = None
    result_url: Optional[str] = None
    confidence: Optional[float] = 0.95

class AISuggestionResponse(BaseModel):
    suggestions: List[str]
    analysis: Dict[str, Any]

class AIWorkflowRequest(BaseModel):
    media_id: str
    media_type: str
    workflow_name: str
    user_instructions: str

class AIChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default_session"
    media_type: Optional[str] = "image"
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = None

class AIChatResponse(BaseModel):
    session_id: str
    message: str
    intent: str
    needs_clarification: bool
    clarifying_questions: Optional[List[Dict[str, Any]]] = []
    action_chips: Optional[List[str]] = []
    execution_ready: bool
    execution_payload: Optional[Dict[str, Any]] = None
    thumbnail_url: Optional[str] = None
    video_model: Optional[str] = "gemini-omni-1.1-flash"
    image_model: Optional[str] = "gemini-3.1-flash-image"
    timestamp: Optional[str] = None

