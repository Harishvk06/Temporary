from typing import Optional, Type, TypeVar, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import decode_access_token
from app.models.user import User

T = TypeVar("T")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _resolve_user_from_token(token: Optional[str], db: Session) -> Optional[User]:
    """Helper to decode JWT token and fetch active user instance."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        if not payload:
            return None
        user_id: str = payload.get("sub")
        if not user_id:
            return None
        user = db.query(User).filter(User.id == user_id).first()
        return user if (user and user.is_active) else None
    except Exception:
        return None


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency that requires a valid authenticated active user."""
    user = _resolve_user_from_token(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Dependency that returns current user if authenticated, or None if guest."""
    return _resolve_user_from_token(token, db)


def get_user_entity_or_404(
    db: Session,
    model_class: Type[T],
    entity_id: str,
    user_id: str,
    entity_name: str = "Resource"
) -> T:
    """Generic query helper to fetch user-owned entity or raise 404."""
    entity = db.query(model_class).filter(
        getattr(model_class, "id") == entity_id,
        getattr(model_class, "user_id") == user_id
    ).first()
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} not found"
        )
    return entity


