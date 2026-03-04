import uuid
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.auth_service import decode_access_token, get_user_by_id
from app.utils.exceptions import ForbiddenException, UnauthorizedException

# DB session dependency
DBSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """認証済みユーザーを取得する依存性"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise UnauthorizedException()

    token = auth_header.split(" ")[1]
    payload = decode_access_token(token)

    sub = payload.get("sub")
    if not sub:
        raise UnauthorizedException("Invalid token: missing sub claim")
    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise UnauthorizedException("Invalid token: malformed sub claim")

    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or inactive")

    return user


async def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """管理者ユーザーを取得する依存性"""
    if current_user.role != "admin":
        raise ForbiddenException("Admin access required")
    return current_user


# Type aliases for dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(get_admin_user)]
