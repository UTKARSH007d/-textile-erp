from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from auth import (
    verify_password,
    create_access_token,
    get_current_user,
    hash_password,
)
from permissions import require_admin


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


# =========================================================
# USER SCHEMAS
# =========================================================

class UserCreate(BaseModel):
    username: str
    full_name: str
    email: str
    password: str
    role: str = "Employee"

class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    password: str | None = None
    role: str | None = None
    is_active: bool | None = None


# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.username == form_data.username)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive."
        )

    if not verify_password(
        form_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    access_token = create_access_token(
        user_id=user.id,
        username=user.username,
        role=user.role
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active
    }


# =========================================================
# ADMIN — CREATE USER
# =========================================================

@router.post("/users")
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing_username = (
        db.query(User)
        .filter(User.username == user_data.username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already exists."
        )

    existing_email = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists."
        )

    allowed_roles = [
        "Admin",
        "Manager",
        "Employee"
    ]

    if user_data.role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Role must be Admin, Manager, or Employee."
        )

    new_user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User created successfully.",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "role": new_user.role,
            "is_active": new_user.is_active
        }
    }


# =========================================================
# ADMIN — GET ALL USERS
# =========================================================

@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = (
        db.query(User)
        .order_by(User.id.asc())
        .all()
    )

    return [
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
        for user in users
    ]

# =========================================================
# ADMIN — UPDATE USER
# =========================================================

@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    update_data = user_data.model_dump(
        exclude_unset=True
    )

    allowed_roles = [
        "Admin",
        "Manager",
        "Employee"
    ]

    if "role" in update_data:
        if update_data["role"] not in allowed_roles:
            raise HTTPException(
                status_code=400,
                detail="Role must be Admin, Manager, or Employee."
            )

    if "email" in update_data:
        existing_email = (
            db.query(User)
            .filter(
                User.email == update_data["email"],
                User.id != user_id
            )
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="Email already exists."
            )

    # Prevent the current Admin from locking
    # themselves out of the ERP.
    if user.id == current_user.id:

        if update_data.get("is_active") is False:
            raise HTTPException(
                status_code=400,
                detail="You cannot deactivate your own account."
            )

        if update_data.get("role") not in (None, "Admin"):
            raise HTTPException(
                status_code=400,
                detail="You cannot remove your own Admin role."
            )

    # Password needs to be hashed separately.
    if "password" in update_data:
        password = update_data.pop("password")

        if password:
            user.hashed_password = hash_password(password)

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    return {
        "message": "User updated successfully.",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
    }