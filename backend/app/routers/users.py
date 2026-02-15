"""ユーザー API"""

import uuid
from datetime import datetime

from fastapi import APIRouter, UploadFile, File
from sqlalchemy import select

from app.dependencies import CurrentUser, DBSession
from app.models.user import User
from app.services.auth_service import hash_password, verify_password
from app.services.image_service import convert_and_save_avatar
from app.utils.exceptions import (
    ForbiddenException,
    NotFoundException,
    ValidationException,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}")
async def get_user_profile(
    user_id: str,
    current_user: CurrentUser,
    db: DBSession,
):
    """ユーザープロフィール取得"""
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    # Public fields only (unless viewing own profile)
    is_self = user.id == current_user.id
    data = {
        "id": str(user.id),
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "is_profile_public": user.is_profile_public,
        "created_at": user.created_at.isoformat(),
    }
    if is_self:
        data["email"] = user.email
        data["locale"] = user.locale
        data["role"] = user.role
        data["is_active"] = user.is_active

    return data


@router.patch("/{user_id}")
async def update_user_profile(
    user_id: str,
    body: dict,
    current_user: CurrentUser,
    db: DBSession,
):
    """プロフィール更新"""
    if str(current_user.id) != user_id:
        raise ForbiddenException("You can only update your own profile")

    allowed_fields = {"display_name", "bio", "locale", "is_profile_public"}
    for key, value in body.items():
        if key in allowed_fields:
            setattr(current_user, key, value)

    await db.commit()
    await db.refresh(current_user)

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "display_name": current_user.display_name,
        "avatar_url": current_user.avatar_url,
        "bio": current_user.bio,
        "locale": current_user.locale,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "is_profile_public": current_user.is_profile_public,
        "created_at": current_user.created_at.isoformat(),
    }


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: str,
    current_user: CurrentUser,
    db: DBSession,
):
    """アカウント無効化（論理削除）"""
    if str(current_user.id) != user_id and current_user.role != "admin":
        raise ForbiddenException("Not authorized")

    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    user.is_active = False
    user.deactivated_at = datetime.utcnow()
    await db.commit()

    return {"message": "Account deactivated"}


@router.patch("/{user_id}/password")
async def change_password(
    user_id: str,
    body: dict,
    current_user: CurrentUser,
    db: DBSession,
):
    """パスワード変更"""
    if str(current_user.id) != user_id:
        raise ForbiddenException("You can only change your own password")

    current_password = body.get("current_password")
    new_password = body.get("new_password")

    if not current_password or not new_password:
        raise ValidationException("Current and new password are required")

    if not verify_password(current_password, current_user.password_hash):
        raise ValidationException("Current password is incorrect")

    if len(new_password) < 8:
        raise ValidationException("New password must be at least 8 characters")

    current_user.password_hash = hash_password(new_password)
    await db.commit()

    return {"message": "Password changed successfully"}


@router.post("/{user_id}/avatar")
async def upload_avatar(
    user_id: str,
    current_user: CurrentUser,
    db: DBSession,
    avatar: UploadFile = File(...),
):
    """アバター画像アップロード"""
    if str(current_user.id) != user_id:
        raise ForbiddenException("You can only update your own avatar")

    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if avatar.content_type not in allowed_types:
        raise ValidationException("Unsupported image format. Use JPEG, PNG, or WebP.")

    # Validate file size (5MB max)
    content = await avatar.read()
    if len(content) > 5 * 1024 * 1024:
        raise ValidationException("File too large. Maximum 5MB.")

    # Process and save avatar
    filename = f"{current_user.id}.webp"
    convert_and_save_avatar(content, filename)

    current_user.avatar_url = f"/api/v1/images/avatars/{filename}"
    await db.commit()
    await db.refresh(current_user)

    return {"avatar_url": current_user.avatar_url}
