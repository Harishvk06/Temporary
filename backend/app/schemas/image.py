from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ImageBase(BaseModel):
    filename: str
    original_filename: Optional[str] = None
    format: Optional[str] = None

class ImageCreate(ImageBase):
    project_id: str
    file_size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None

class ImageEditRequest(BaseModel):
    edit_type: str  # enhance, filter, remove_background, adjust, crop
    prompt: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class ImageResponse(ImageBase):
    id: str
    project_id: str
    user_id: str
    file_size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    s3_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
