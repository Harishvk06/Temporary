import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import List, Union, Optional

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "AuraEdit AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "auraedit-super-secret-key-change-in-production-environments"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./auraedit.db"

    # AI Configuration
    GEMINI_API_API_KEY: str = os.getenv("GEMINI_API_API_KEY", "")
    DEFAULT_AI_MODEL: str = os.getenv("DEFAULT_AI_MODEL", "gemini-3.5-flash")
    VIDEO_AI_MODEL: str = os.getenv("VIDEO_AI_MODEL", os.getenv("VIDEO_MODEL_ENDPOINT", "gemini-omni-1.1-flash"))
    VIDEO_MODEL_ENDPOINT: str = os.getenv("VIDEO_MODEL_ENDPOINT", os.getenv("VIDEO_AI_MODEL", "gemini-omni-1.1-flash"))
    IMAGE_GENERATION_MODEL: str = os.getenv("IMAGE_GENERATION_MODEL", os.getenv("IMAGE_MODEL_ENDPOINT", "gemini-3.1-flash-image"))
    IMAGE_MODEL_ENDPOINT: str = os.getenv("IMAGE_MODEL_ENDPOINT", os.getenv("IMAGE_GENERATION_MODEL", "gemini-3.1-flash-image"))

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # CORS
    ALLOWED_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173"
    ]

    # OTP & SMS Configuration
    OTP_EXPIRE_MINUTES: int = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))
    OTP_RESEND_COOLDOWN_SECONDS: int = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))
    TWILIO_ACCOUNT_SID: Optional[str] = os.getenv("TWILIO_ACCOUNT_SID", None)
    TWILIO_AUTH_TOKEN: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN", None)
    TWILIO_PHONE_NUMBER: Optional[str] = os.getenv("TWILIO_PHONE_NUMBER", None)

    # SMTP Mail Transporter
    EMAIL_ADDRESS: str = os.getenv("EMAIL_ADDRESS", os.getenv("MAIL_USERNAME", "auth@auraedit.ai"))
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", os.getenv("MAIL_PASSWORD", ""))
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USERNAME: str = os.getenv("EMAIL_ADDRESS", os.getenv("MAIL_USERNAME", "auth@auraedit.ai"))
    MAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", os.getenv("MAIL_PASSWORD", ""))
    MAIL_FROM: str = os.getenv("MAIL_FROM", os.getenv("EMAIL_ADDRESS", "noreply@auraedit.ai"))
    MAIL_STARTTLS: bool = os.getenv("MAIL_STARTTLS", "True").lower() in ("true", "1", "t")
    MAIL_SSL_TLS: bool = os.getenv("MAIL_SSL_TLS", "False").lower() in ("true", "1", "t")

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
