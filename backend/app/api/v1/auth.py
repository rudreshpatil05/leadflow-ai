from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.auth import get_current_user, require_admin
from backend.app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from backend.app.db.database import Base, engine, get_db
from backend.app.models.user import User
from backend.app.schemas.user import (
    LoginRequest,
    UserCreate,
    UserResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.on_event("startup")
def create_user_table():
    Base.metadata.create_all(
        bind=engine,
        tables=[User.__table__],
    )


@router.post("/register")
def register_user(
    data: UserCreate,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(User)
        .filter(User.email == data.email.lower())
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="A user with this email already exists.",
        )

    role = str(data.role or "SALES").upper()

    if role not in {
        "ADMIN",
        "MANAGER",
        "SALES",
    }:
        raise HTTPException(
            status_code=400,
            detail="Invalid role.",
        )

    user = User(
        name=data.name.strip(),
        email=data.email.lower().strip(),
        password_hash=hash_password(data.password),
        role=role,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "user": UserResponse.model_validate(user),
    }


@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(
            User.email == data.email.lower().strip()
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive.",
        )

    token = create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role,
    )

    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }


@router.get("/me")
def current_user(
    user: User = Depends(get_current_user),
):
    return {
        "success": True,
        "user": UserResponse.model_validate(user),
    }


@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return (
        db.query(User)
        .order_by(User.created_at.desc())
        .all()
    )


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    user.is_active = is_active

    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "user": UserResponse.model_validate(user),
    }