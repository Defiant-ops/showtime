from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import User


def require_admin(
    x_user_id: int = Header(...),
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.user_id == x_user_id).first()
    if not user or user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user