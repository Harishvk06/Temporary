from typing import Optional
from fastapi import APIRouter, Depends, status, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import oauth2_scheme_optional
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.schemas.api import (
    Token,
    ResponseMessage,
    OTPRequest,
    OTPVerifyRequest,
    OTPResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account"""
    return auth_service.register_user(db, user_in)

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password to receive JWT token"""
    return auth_service.authenticate_user(db, credentials)

@router.post("/send-otp", response_model=OTPResponse)
@router.post("/request-otp", response_model=OTPResponse)
def request_otp(data: OTPRequest, db: Session = Depends(get_db)):
    """Generate 6-digit OTP and dispatch via Email SMTP or Phone SMS"""
    return auth_service.generate_and_send_otp(
        db=db,
        email=data.email,
        password=data.password,
        phone_number=data.phone_number
    )

@router.post("/verify-otp", response_model=Token)
def verify_otp(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Verify 6-digit OTP code and issue JWT access token"""
    return auth_service.verify_otp_and_login(
        db=db,
        otp_code=data.otp_code,
        email=data.email,
        phone_number=data.phone_number
    )

@router.post("/logout", response_model=ResponseMessage)
def logout():
    """Logout current session"""
    return ResponseMessage(message="Successfully logged out")

@router.post("/refresh", response_model=Token)
def refresh_token(
    data: Optional[RefreshTokenRequest] = None,
    current_token: Optional[str] = None,
    header_token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
):
    """
    Refresh JWT access token.
    Accepts token via JSON body `refresh_token`, query param `current_token`, or Bearer Authorization header.
    """
    resolved_token = (data.refresh_token if data and data.refresh_token else None) or current_token or header_token
    return auth_service.refresh_access_token(db, resolved_token)

@router.post("/forgot-password", response_model=ResponseMessage)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset token link"""
    res = auth_service.request_password_reset(db, data.email)
    return ResponseMessage(message=res["message"])

@router.post("/reset-password", response_model=ResponseMessage)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using verified token"""
    res = auth_service.reset_password(db, data.token, data.new_password)
    return ResponseMessage(message=res["message"])
