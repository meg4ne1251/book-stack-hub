"""プレイリストAPI"""
import secrets
import uuid

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DBSession
from app.models.playlist import Playlist, PlaylistItem
from app.routers.books import _book_to_response
from app.utils.exceptions import (
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.utils.response import paginated_response

router = APIRouter(tags=["playlists"])


class PlaylistCreate(BaseModel):
    title: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=1000)


class PlaylistUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    is_public: bool | None = None


class PlaylistItemAdd(BaseModel):
    book_id: str


class PlaylistReorder(BaseModel):
    item_ids: list[str]


def _playlist_to_response(playlist: Playlist) -> dict:
    items = []
    for item in playlist.items:
        items.append({
            "id": str(item.id),
            "book": _book_to_response(item.book),
            "position": item.position,
        })

    return {
        "id": str(playlist.id),
        "user_id": str(playlist.user_id),
        "title": playlist.title,
        "description": playlist.description,
        "is_public": playlist.is_public,
        "share_slug": playlist.share_slug,
        "items": items,
        "created_at": str(playlist.created_at),
        "updated_at": str(playlist.updated_at),
    }


me_router = APIRouter(prefix="/me/playlists", tags=["playlists"])


@me_router.get("")
async def list_my_playlists(
    current_user: CurrentUser,
    db: DBSession,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
):
    """自分のプレイリスト一覧"""
    count_q = select(func.count(Playlist.id)).where(
        Playlist.user_id == current_user.id
    )
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    offset = (page - 1) * per_page
    result = await db.execute(
        select(Playlist)
        .where(Playlist.user_id == current_user.id)
        .options(selectinload(Playlist.items).selectinload(PlaylistItem.book))
        .order_by(Playlist.updated_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    playlists = result.scalars().all()

    data = [_playlist_to_response(p) for p in playlists]
    return paginated_response(data, page, per_page, total)


@me_router.post("")
async def create_playlist(
    body: PlaylistCreate,
    current_user: CurrentUser,
    db: DBSession,
):
    """プレイリスト作成"""
    # 上限チェック（50プレイリスト）
    count_result = await db.execute(
        select(func.count(Playlist.id)).where(
            Playlist.user_id == current_user.id
        )
    )
    count = count_result.scalar() or 0
    if count >= 50:
        raise ValidationException("Maximum 50 playlists per user")

    playlist = Playlist(
        user_id=current_user.id,
        title=body.title,
        description=body.description,
    )
    db.add(playlist)
    await db.flush()

    # Reload with relationships to avoid MissingGreenlet
    result = await db.execute(
        select(Playlist)
        .where(Playlist.id == playlist.id)
        .options(selectinload(Playlist.items).selectinload(PlaylistItem.book))
    )
    playlist = result.scalar_one()

    return {"data": _playlist_to_response(playlist)}


@router.get("/playlists/{playlist_id}")
async def get_playlist(
    playlist_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """プレイリスト詳細"""
    result = await db.execute(
        select(Playlist)
        .where(Playlist.id == playlist_id)
        .options(selectinload(Playlist.items).selectinload(PlaylistItem.book))
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise NotFoundException("Playlist not found")

    # 非公開は所有者のみ
    if not playlist.is_public and playlist.user_id != current_user.id:
        raise ForbiddenException("Cannot access this playlist")

    return {"data": _playlist_to_response(playlist)}


@router.patch("/playlists/{playlist_id}")
async def update_playlist(
    playlist_id: uuid.UUID,
    body: PlaylistUpdate,
    current_user: CurrentUser,
    db: DBSession,
):
    """プレイリスト編集"""
    result = await db.execute(
        select(Playlist)
        .where(Playlist.id == playlist_id, Playlist.user_id == current_user.id)
        .options(selectinload(Playlist.items).selectinload(PlaylistItem.book))
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise NotFoundException("Playlist not found")

    update_data = body.model_dump(exclude_unset=True)

    # 公開に変更時、share_slugを生成
    if "is_public" in update_data and update_data["is_public"] and not playlist.share_slug:
        playlist.share_slug = secrets.token_urlsafe(16)

    for key, value in update_data.items():
        setattr(playlist, key, value)

    return {"data": _playlist_to_response(playlist)}


@router.delete("/playlists/{playlist_id}", status_code=204)
async def delete_playlist(
    playlist_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """プレイリスト削除"""
    result = await db.execute(
        select(Playlist).where(
            Playlist.id == playlist_id, Playlist.user_id == current_user.id
        )
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise NotFoundException("Playlist not found")

    await db.delete(playlist)


@router.post("/playlists/{playlist_id}/items")
async def add_playlist_item(
    playlist_id: uuid.UUID,
    body: PlaylistItemAdd,
    current_user: CurrentUser,
    db: DBSession,
):
    """プレイリストに書籍追加"""
    result = await db.execute(
        select(Playlist)
        .where(Playlist.id == playlist_id, Playlist.user_id == current_user.id)
        .options(selectinload(Playlist.items))
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise NotFoundException("Playlist not found")

    # 100冊上限チェック
    if len(playlist.items) >= 100:
        raise ValidationException("Maximum 100 books per playlist")

    book_id = uuid.UUID(body.book_id)

    # 重複チェック
    for item in playlist.items:
        if item.book_id == book_id:
            raise ValidationException("Book already in playlist")

    # 最大position + 1
    max_position = max((item.position for item in playlist.items), default=0)

    new_item = PlaylistItem(
        playlist_id=playlist_id,
        book_id=book_id,
        position=max_position + 1,
    )
    db.add(new_item)
    await db.flush()

    return {"data": {"id": str(new_item.id), "position": new_item.position}}


@router.delete("/playlists/{playlist_id}/items/{item_id}", status_code=204)
async def remove_playlist_item(
    playlist_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """プレイリストから書籍削除"""
    result = await db.execute(
        select(Playlist).where(
            Playlist.id == playlist_id, Playlist.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise NotFoundException("Playlist not found")

    result = await db.execute(
        select(PlaylistItem).where(
            PlaylistItem.id == item_id, PlaylistItem.playlist_id == playlist_id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException("Item not found")

    await db.delete(item)


@router.patch("/playlists/{playlist_id}/items/reorder")
async def reorder_playlist_items(
    playlist_id: uuid.UUID,
    body: PlaylistReorder,
    current_user: CurrentUser,
    db: DBSession,
):
    """プレイリスト並び替え"""
    result = await db.execute(
        select(Playlist)
        .where(Playlist.id == playlist_id, Playlist.user_id == current_user.id)
        .options(selectinload(Playlist.items))
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise NotFoundException("Playlist not found")

    item_map = {str(item.id): item for item in playlist.items}

    for position, item_id in enumerate(body.item_ids, start=1):
        if item_id in item_map:
            item_map[item_id].position = position

    return {"data": "ok"}


# 公開プレイリスト閲覧（認証不要）
share_router = APIRouter(tags=["share"])


@share_router.get("/share/{slug}")
async def get_shared_playlist(
    slug: str,
    db: DBSession,
):
    """公開プレイリスト閲覧"""
    result = await db.execute(
        select(Playlist)
        .where(Playlist.share_slug == slug, Playlist.is_public.is_(True))
        .options(selectinload(Playlist.items).selectinload(PlaylistItem.book))
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise NotFoundException("Playlist not found")

    return {"data": _playlist_to_response(playlist)}
