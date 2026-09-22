from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "image"  # image or video
    is_public: bool = False

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_public: Optional[bool] = None

class ProjectResponse(ProjectBase):
    id: str
    user_id: str
    thumbnail_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_edited_at: datetime

    class Config:
        from_attributes = True
