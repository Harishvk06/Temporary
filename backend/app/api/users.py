from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.edit_history import EditHistory
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.api import ResponseMessage, ChangePasswordRequest
from app.services.auth_service import auth_service

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Fetch current logged in user profile"""
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile details"""
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.username is not None:
        current_user.username = user_update.username
    if user_update.profile_picture_url is not None:
        current_user.profile_picture_url = user_update.profile_picture_url

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password", response_model=ResponseMessage)
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password for authenticated user"""
    res = auth_service.change_password(db, current_user, data.current_password, data.new_password)
    return ResponseMessage(message=res["message"])

@router.get("/credits")
def get_credits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dynamic credit balance, subscription tier, and lifetime edit metrics"""
    total_edits = db.query(EditHistory).filter(EditHistory.user_id == current_user.id).count()
    credits_used = max(0, 1000 - current_user.credits_remaining)
    return {
        "subscription_tier": current_user.subscription_tier,
        "credits_remaining": current_user.credits_remaining,
        "credits_used": credits_used,
        "total_edits": total_edits
    }

@router.delete("/profile", response_model=ResponseMessage)
def delete_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete current user account and all associated resources"""
    db.delete(current_user)
    db.commit()
    return ResponseMessage(message="User account deleted successfully.")
