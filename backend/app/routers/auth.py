from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import commit_with_retry, get_db
from ..models import User
from ..schemas import LoginRequest, UserCreate, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        name=data.name,
        email=data.email,
        password=data.password,
        role="USER",
    )
    db.add(new_user)
    commit_with_retry(db)
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=UserOut)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(User.email == data.email, User.password == data.password)
        .first()
    )

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return user

