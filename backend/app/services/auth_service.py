import random
import time
import secrets
from typing import Optional, Dict, Any
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin
from app.schemas.api import OTPResponse, Token, ResponseMessage
from app.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.services.email_service import email_service
from app.services.sms_service import sms_service

# In-memory OTP storage: { identifier: { "code": "123456", "expires_at": timestamp } }
otp_store: Dict[str, Dict[str, Any]] = {}

# In-memory password reset tokens: { token_str: { "email": email, "expires_at": timestamp } }
password_reset_store: Dict[str, Dict[str, Any]] = {}


class AuthService:
    @staticmethod
    def _generate_unique_username(db: Session, base_name: str) -> str:
        """Generate an available unique username by appending incrementing counter if needed."""
        clean_base = (base_name or "user").lower().strip()
        username = clean_base
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{clean_base}_{counter}"
            counter += 1
        return username

    @staticmethod
    def _create_user(
        db: Session,
        email: str,
        username: Optional[str] = None,
        password_hash: Optional[str] = None,
        full_name: Optional[str] = None
    ) -> User:
        """Helper to instantiate, persist, and return a new User model."""
        clean_email = email.lower().strip()
        base_name = clean_email.split('@')[0]
        resolved_username = username or AuthService._generate_unique_username(db, base_name)
        resolved_full_name = full_name or base_name.capitalize()
        resolved_hash = password_hash or get_password_hash("default123")

        db_user = User(
            email=clean_email,
            username=resolved_username,
            full_name=resolved_full_name,
            password_hash=resolved_hash,
            subscription_tier="free",
            credits_remaining=1000
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def register_user(db: Session, user_in: UserCreate) -> User:
        clean_email = user_in.email.lower().strip()
        existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists."
            )
        
        base_username = user_in.username or clean_email.split('@')[0]
        unique_username = AuthService._generate_unique_username(db, base_username)
        return AuthService._create_user(
            db=db,
            email=clean_email,
            username=unique_username,
            password_hash=get_password_hash(user_in.password),
            full_name=user_in.full_name
        )

    @staticmethod
    def authenticate_user(db: Session, credentials: UserLogin) -> dict:
        clean_email = credentials.email.lower().strip()
        user = db.query(User).filter(func.lower(User.email) == clean_email).first()
        if not user or not verify_password(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = create_access_token(user.id)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user.id,
            "email": user.email
        }

    @staticmethod
    def generate_and_send_otp(
        db: Session,
        email: Optional[str] = None,
        password: Optional[str] = None,
        phone_number: Optional[str] = None
    ) -> OTPResponse:
        """
        Unified OTP dispatcher supporting email (via SMTP) and phone number (via Twilio/SMS simulator).
        """
        # 1. Handle Phone Number OTP
        if phone_number and not email:
            success, message, expires_in, dev_otp = sms_service.send_otp(phone_number)
            if not success:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=message)
            return OTPResponse(
                status="success",
                message=message,
                otp_required=True,
                expires_in_seconds=expires_in or 300,
                dev_otp=dev_otp
            )

        # 2. Handle Email OTP
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either email or phone number is required to request an OTP."
            )

        clean_email = email.lower().strip()
        user = db.query(User).filter(func.lower(User.email) == clean_email).first()
        
        if not user:
            # Auto-provision user account on initial OTP request if user does not exist
            pass_hash = get_password_hash(password) if password else None
            user = AuthService._create_user(db=db, email=clean_email, password_hash=pass_hash)
        elif password:
            if not verify_password(password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect password for this email address. Please check your password and try again."
                )

        # Generate random 6-digit numeric OTP code
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = time.time() + 300  # 5 minutes expiry

        otp_store[clean_email] = {
            "code": otp_code,
            "expires_at": expires_at
        }

        # Dispatch via SMTP transporter
        sent = email_service.send_otp_email(clean_email, otp_code)
        dev_otp = otp_code if not sent else None

        return OTPResponse(
            status="success",
            message="OTP sent successfully to your email" if sent else "OTP generated successfully (Console delivery mode)",
            otp_required=True,
            expires_in_seconds=300,
            dev_otp=dev_otp
        )

    @staticmethod
    def verify_otp_and_login(
        db: Session,
        otp_code: str,
        email: Optional[str] = None,
        phone_number: Optional[str] = None
    ) -> dict:
        """
        Verifies 6-digit OTP code for either phone number or email and issues JWT access token.
        """
        # 1. Phone number verification
        if phone_number and not email:
            success, message = sms_service.verify_otp(phone_number, otp_code)
            if not success:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
            
            clean_phone_email = f"{phone_number.replace('+', '').replace(' ', '')}@sms.auraedit.ai"
            user = db.query(User).filter(func.lower(User.email) == clean_phone_email.lower()).first()
            if not user:
                user = AuthService._create_user(db=db, email=clean_phone_email, full_name=f"User {phone_number}")
            
            token = create_access_token(user.id)
            return {
                "access_token": token,
                "token_type": "bearer",
                "user_id": user.id,
                "email": user.email,
                "message": "Phone OTP verification successful"
            }

        # 2. Email verification
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or phone number is required for OTP verification."
            )

        clean_email = email.lower().strip()
        record = otp_store.get(clean_email)

        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OTP code requested for this email. Please request a new code."
            )

        if time.time() > record["expires_at"]:
            otp_store.pop(clean_email, None)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP code has expired. Please request a new code."
            )

        if record["code"] != otp_code.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP verification code. Please check your email and try again."
            )

        # Invalidate used OTP code (One-Time Use Security)
        otp_store.pop(clean_email, None)

        user = db.query(User).filter(func.lower(User.email) == clean_email).first()
        if not user:
            user = AuthService._create_user(db=db, email=clean_email)

        token = create_access_token(user.id)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user.id,
            "email": user.email,
            "message": "OTP verification successful"
        }

    @staticmethod
    def refresh_access_token(db: Session, token_str: str) -> dict:
        """
        Validates an existing JWT token or refresh token and issues a refreshed access token.
        """
        if not token_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is required for refresh."
            )

        # Handle optional Bearer prefix
        raw_token = token_str.replace("Bearer ", "").strip()
        payload = decode_access_token(raw_token)
        if not payload or not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token. Please log in again."
            )

        user_id = payload["sub"]
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or deactivated."
            )

        new_token = create_access_token(user.id)
        return {
            "access_token": new_token,
            "token_type": "bearer",
            "user_id": user.id,
            "email": user.email
        }

    @staticmethod
    def request_password_reset(db: Session, email: str) -> dict:
        """
        Generates a secure password reset token and stores it with 15-minute expiry.
        """
        clean_email = email.lower().strip()
        user = db.query(User).filter(func.lower(User.email) == clean_email).first()
        
        # Security best practice: don't reveal if user exists, return generic success message
        reset_token = secrets.token_urlsafe(32)
        password_reset_store[reset_token] = {
            "email": clean_email,
            "expires_at": time.time() + 900  # 15 minutes
        }

        if user:
            email_service.send_otp_email(clean_email, f"Password Reset Token: {reset_token[:8]}")

        return {
            "success": True,
            "message": f"If an account with {clean_email} exists, a password reset link has been dispatched."
        }

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> dict:
        """
        Resets user's password using the validated reset token.
        """
        record = password_reset_store.get(token)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token."
            )

        if time.time() > record["expires_at"]:
            password_reset_store.pop(token, None)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token has expired. Please request a new one."
            )

        email = record["email"]
        user = db.query(User).filter(func.lower(User.email) == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found."
            )

        user.password_hash = get_password_hash(new_password)
        db.commit()
        password_reset_store.pop(token, None)

        return {
            "success": True,
            "message": "Password reset successfully. You can now login with your new password."
        }

    @staticmethod
    def change_password(db: Session, user: User, current_password: str, new_password: str) -> dict:
        """
        Allows an authenticated user to change their account password.
        """
        if not verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect."
            )
        
        user.password_hash = get_password_hash(new_password)
        db.commit()
        return {
            "success": True,
            "message": "Password changed successfully."
        }


auth_service = AuthService()
