from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class VideoBase(BaseModel):
    filename: str
    original_filename: Optional[str] = None
    format: Optional[str] = None

class VideoCreate(VideoBase):
    project_id: str
    file_size: Optional[int] = None
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[int] = None

class VideoTrimRequest(BaseModel):
    start_time: float
    end_time: float

class VideoEditRequest(BaseModel):
    edit_type: str  # trim, filter, add_transition, change_speed, color_grading
    prompt: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class VideoResponse(VideoBase):
    id: str
    project_id: str
    user_id: str
    file_size: Optional[int] = None
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[int] = None
    s3_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    audio_track_count: int = 1
    created_at: datetime

    class Config:
        from_attributes = True
