from fastapi import Depends, HTTPException, status

from auth import get_current_user
from models.user import User


def require_admin(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required."
        )

    return current_user


def require_manager_or_admin(
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["Admin", "Manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or Admin access required."
        )

    return current_user


def require_authenticated_user(
    current_user: User = Depends(get_current_user)
):
    return current_user