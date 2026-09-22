import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class EditHistory(Base):
    __tablename__ = "edit_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    image_id = Column(String(36), ForeignKey("images.id", ondelete="CASCADE"), nullable=True, index=True)
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    edit_type = Column(String(100), nullable=False)
    prompt = Column(String(1000), nullable=True)
    parameters = Column(JSON, nullable=True)
    result_url = Column(String(500), nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    ai_model = Column(String(100), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    cost = Column(Numeric(10, 4), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    image = relationship("Image", back_populates="edit_histories")
    video = relationship("Video", back_populates="edit_histories")
    user = relationship("User", back_populates="edit_histories")
