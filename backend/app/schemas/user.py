from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    username: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    profile_picture_url: Optional[str] = None

class UserResponse(UserBase):
    id: str
    subscription_tier: str
    credits_remaining: int
    profile_picture_url: Optional[str] = None
    email_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
