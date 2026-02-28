"""管理者 API"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select, and_

from app.dependencies import AdminUser, DBSession
from app.models.user import User
from app.models.book import Book
from app.models.user_book import UserBook
from app.models.review import Review
from app.models.playlist import Playlist
from app.utils.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.utils.response import paginated_response

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    role: Literal["user", "admin"] | None = None


class AdminVisibilityUpdate(BaseModel):
    is_public: bool


@router.get("/stats")
async def get_admin_stats(
    admin: AdminUser,
    db: DBSession,
):
    """システム統計"""
    now = datetime.now(UTC)
    thirty_days_ago = now - timedelta(days=30)

    total_users = await db.scalar(select(func.count(User.id)))
    active_users_30d = await db.scalar(
        select(func.count(User.id)).where(
            and_(User.is_active.is_(True), User.updated_at >= thirty_days_ago)
        )
    )
    total_books = await db.scalar(
        select(func.count(Book.id)).where(Book.is_custom.is_(False))
    )
    total_custom_books = await db.scalar(
        select(func.count(Book.id)).where(Book.is_custom.is_(True))
    )
    total_reviews = await db.scalar(select(func.count(Review.id)))
    total_playlists = await db.scalar(select(func.count(Playlist.id)))

    return {
        "total_users": total_users or 0,
        "active_users_30d": active_users_30d or 0,
        "total_books": total_books or 0,
        "total_custom_books": total_custom_books or 0,
        "total_reviews": total_reviews or 0,
        "total_playlists": total_playlists or 0,
    }


@router.get("/users")
async def list_users(
    admin: AdminUser,
    db: DBSession,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
    q: str | None = None,
):
    """ユーザー一覧"""
    query = select(User)
    count_query = select(func.count(User.id))

    if q:
        filter_cond = User.username.ilike(f"%{q}%") | User.email.ilike(
            f"%{q}%"
        ) | User.display_name.ilike(f"%{q}%")
        query = query.where(filter_cond)
        count_query = count_query.where(filter_cond)

    total = await db.scalar(count_query)
    result = await db.execute(
        query.order_by(User.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    users = result.scalars().all()

    data = [
        {
            "id": str(u.id),
            "email": u.email,
            "username": u.username,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]

    return paginated_response(data, page, per_page, total or 0)


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    body: AdminUserUpdate,
    admin: AdminUser,
    db: DBSession,
):
    """ユーザー状態変更"""
    try:
        parsed_user_id = uuid.UUID(user_id)
    except ValueError:
        raise ValidationException("Invalid user_id format")

    # 管理者自身への変更を禁止（自己ロック・自己降格防止）
    if parsed_user_id == admin.id:
        raise ForbiddenException("Cannot modify your own account via admin API")

    result = await db.execute(
        select(User).where(User.id == parsed_user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    update_data = body.model_dump(exclude_unset=True)
    if "is_active" in update_data:
        user.is_active = update_data["is_active"]
        if not update_data["is_active"]:
            user.deactivated_at = datetime.now(UTC)
    if "role" in update_data:
        user.role = update_data["role"]

    return {
        "id": str(user.id),
        "email": user.email,
        "username": user.username,
        "display_name": user.display_name,
        "role": user.role,
        "is_active": user.is_active,
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: AdminUser,
    db: DBSession,
):
    """ユーザー削除（論理削除）"""
    try:
        parsed_user_id = uuid.UUID(user_id)
    except ValueError:
        raise ValidationException("Invalid user_id format")

    # 管理者自身の削除を禁止
    if parsed_user_id == admin.id:
        raise ForbiddenException("Cannot deactivate your own account via admin API")

    result = await db.execute(
        select(User).where(User.id == parsed_user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User not found")

    user.is_active = False
    user.deactivated_at = datetime.now(UTC)

    return {"message": "User deactivated"}


@router.get("/reviews")
async def list_public_reviews(
    admin: AdminUser,
    db: DBSession,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
):
    """公開レビュー一覧"""
    query = select(Review).where(Review.is_public.is_(True))
    count_query = select(func.count(Review.id)).where(Review.is_public.is_(True))

    total = await db.scalar(count_query)
    result = await db.execute(
        query.order_by(Review.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    reviews = result.scalars().all()

    data = [
        {
            "id": str(r.id),
            "user_id": str(r.user_id),
            "book_id": str(r.book_id),
            "title": r.title,
            "body": r.body,
            "is_public": r.is_public,
            "created_at": r.created_at.isoformat(),
        }
        for r in reviews
    ]

    return paginated_response(data, page, per_page, total or 0)


@router.patch("/reviews/{review_id}")
async def update_review_visibility(
    review_id: str,
    body: AdminVisibilityUpdate,
    admin: AdminUser,
    db: DBSession,
):
    """レビュー非公開化"""
    try:
        parsed_review_id = uuid.UUID(review_id)
    except ValueError:
        raise ValidationException("Invalid review_id format")

    result = await db.execute(
        select(Review).where(Review.id == parsed_review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise NotFoundException("Review not found")

    review.is_public = body.is_public
    if not body.is_public:
        review.published_at = None

    return {"message": "Review updated"}


@router.get("/playlists")
async def list_public_playlists(
    admin: AdminUser,
    db: DBSession,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
):
    """公開プレイリスト一覧"""
    query = select(Playlist).where(Playlist.is_public.is_(True))
    count_query = select(func.count(Playlist.id)).where(
        Playlist.is_public.is_(True)
    )

    total = await db.scalar(count_query)
    result = await db.execute(
        query.order_by(Playlist.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    playlists = result.scalars().all()

    data = [
        {
            "id": str(p.id),
            "user_id": str(p.user_id),
            "title": p.title,
            "description": p.description,
            "is_public": p.is_public,
            "share_slug": p.share_slug,
            "created_at": p.created_at.isoformat(),
        }
        for p in playlists
    ]

    return paginated_response(data, page, per_page, total or 0)


@router.patch("/playlists/{playlist_id}")
async def update_playlist_visibility(
    playlist_id: str,
    body: AdminVisibilityUpdate,
    admin: AdminUser,
    db: DBSession,
):
    """プレイリスト非公開化"""
    try:
        parsed_playlist_id = uuid.UUID(playlist_id)
    except ValueError:
        raise ValidationException("Invalid playlist_id format")

    result = await db.execute(
        select(Playlist).where(Playlist.id == parsed_playlist_id)
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise NotFoundException("Playlist not found")

    playlist.is_public = body.is_public

    return {"message": "Playlist updated"}


@router.post("/books/refresh")
async def refresh_books(
    admin: AdminUser,
):
    """書籍情報更新バッチ手動実行"""
    from app.tasks.books import refresh_stale_books

    task = refresh_stale_books.delay()
    return {"task_id": str(task.id), "message": "Book refresh task queued"}
