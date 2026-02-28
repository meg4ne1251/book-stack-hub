"""ユーザー API"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Query, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DBSession
from app.models.book import Book
from app.models.user import User
from app.models.user_book import UserBook
from app.routers.books import _book_to_response
from app.schemas.auth import ChangePasswordRequest
from app.services.auth_service import hash_password, verify_password
from app.services.image_service import convert_and_save_avatar
from app.utils.exceptions import (
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.utils.response import paginated_response

router = APIRouter(prefix="/users", tags=["users"])


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=50)
    bio: str | None = Field(default=None, max_length=500)
    locale: str | None = Field(default=None, max_length=5)
    is_profile_public: bool | None = None


@router.get("/{user_id}")
async def get_user_profile(
    user_id: str,
    current_user: CurrentUser,
    db: DBSession,
):
    """ユーザープロフィール取得（UUIDまたはusernameで検索）"""
    # Try UUID first, fall back to username lookup
    try:
        parsed_id = uuid.UUID(user_id)
        result = await db.execute(
            select(User).where(User.id == parsed_id)
        )
    except ValueError:
        result = await db.execute(
            select(User).where(User.username == user_id)
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


@router.get("/{user_id}/books")
async def get_user_public_books(
    user_id: str,
    current_user: CurrentUser,
    db: DBSession,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
):
    """ユーザーの公開本棚を取得"""
    # Resolve user by UUID or username
    try:
        parsed_id = uuid.UUID(user_id)
        result = await db.execute(select(User).where(User.id == parsed_id))
    except ValueError:
        result = await db.execute(select(User).where(User.username == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    is_self = user.id == current_user.id
    if not is_self and not user.is_profile_public:
        return paginated_response([], page, per_page, 0)

    base_q = (
        select(UserBook)
        .where(UserBook.user_id == user.id)
        .options(selectinload(UserBook.book), selectinload(UserBook.tags))
        .order_by(UserBook.created_at.desc())
    )
    count_q = select(func.count(UserBook.id)).where(UserBook.user_id == user.id)

    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    offset = (page - 1) * per_page
    result = await db.execute(base_q.offset(offset).limit(per_page))
    user_books = list(result.scalars().all())

    data = [
        {
            "id": str(ub.id),
            "book": _book_to_response(ub.book),
            "status": ub.status,
            "rating": ub.rating,
            # private_memo は非公開情報のため他ユーザーには返さない
            **({
                "private_memo": ub.private_memo,
                "purchase_price": ub.purchase_price,
            } if is_self else {}),
            "is_owned": ub.is_owned,
            "tags": [{"id": str(t.id), "name": t.name} for t in ub.tags],
            "created_at": str(ub.created_at),
        }
        for ub in user_books
    ]
    return paginated_response(data, page, per_page, total)


@router.patch("/{user_id}")
async def update_user_profile(
    user_id: str,
    body: ProfileUpdate,
    current_user: CurrentUser,
    db: DBSession,
):
    """プロフィール更新"""
    if str(current_user.id) != user_id:
        raise ForbiddenException("You can only update your own profile")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)

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
    user.deactivated_at = datetime.now(UTC)

    return {"message": "Account deactivated"}


@router.patch("/{user_id}/password")
async def change_password(
    user_id: str,
    body: ChangePasswordRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """パスワード変更"""
    if str(current_user.id) != user_id:
        raise ForbiddenException("You can only change your own password")

    if not verify_password(body.current_password, current_user.password_hash):
        raise ValidationException("Current password is incorrect")

    current_user.password_hash = hash_password(body.new_password)

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

    # マジックバイト検証（Content-Type偽装対策）
    from app.services.image_service import validate_image_magic_bytes
    if not validate_image_magic_bytes(content):
        raise ValidationException("Invalid image file. File header does not match expected format.")

    # Process and save avatar
    filename = convert_and_save_avatar(content, str(current_user.id))
    if not filename:
        raise ValidationException("Failed to process avatar image")

    current_user.avatar_url = filename

    from app.services.image_service import generate_signed_url
    signed_url = generate_signed_url(filename).replace("/api/v1/images/", "/api/v1/avatars/")
    return {"avatar_url": signed_url}
