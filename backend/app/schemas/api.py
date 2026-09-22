from pydantic import BaseModel, EmailStr
from typing import Optional, Any

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str

class ResponseMessage(BaseModel):
    success: bool = True
    message: str
    data: Optional[Any] = None

class OTPRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    phone_number: Optional[str] = None

class OTPVerifyRequest(BaseModel):
    email: Optional[str] = None
    phone_number: Optional[str] = None
    otp_code: str

class OTPResponse(BaseModel):
    status: str = "success"
    message: str = "OTP sent successfully"
    otp_required: bool = True
    expires_in_seconds: int = 300
    dev_otp: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
