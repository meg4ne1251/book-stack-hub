"""ユーザー書籍API（本棚）"""
import uuid
from datetime import date

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DBSession
from pydantic import BaseModel

from app.models.book import Book
from app.models.tag import Tag
from app.models.user_book import UserBook
from app.routers.books import _book_to_response
from app.schemas.user_book import UserBookCreate, UserBookUpdate
from app.services.image_service import generate_signed_url
from app.utils.exceptions import (
    AlreadyExistsException,
    CustomBookRestrictedException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.utils.response import paginated_response

router = APIRouter(prefix="/me/books", tags=["bookshelf"])

VALID_STATUSES = {
    "want_to_read", "unread", "reading", "suspended", "finished"
}


def _user_book_to_response(ub: UserBook) -> dict:
    """UserBookモデルをレスポンスdictに変換"""
    return {
        "id": str(ub.id),
        "book": _book_to_response(ub.book),
        "status": ub.status,
        "rating": ub.rating,
        "private_memo": ub.private_memo,
        "is_owned": ub.is_owned,
        "purchase_price": ub.purchase_price,
        "started_reading_at": str(ub.started_reading_at) if ub.started_reading_at else None,
        "finished_reading_at": str(ub.finished_reading_at) if ub.finished_reading_at else None,
        "tags": [{"id": str(t.id), "name": t.name} for t in ub.tags],
        "created_at": str(ub.created_at),
        "updated_at": str(ub.updated_at),
    }


@router.get("")
async def list_my_books(
    current_user: CurrentUser,
    db: DBSession,
    status: str | None = Query(default=None),
    is_custom: bool | None = Query(default=None),
    book_id: str | None = Query(default=None),
    sort: str = Query(default="created_at_desc"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
):
    """自分の本棚一覧"""
    base_q = (
        select(UserBook)
        .where(UserBook.user_id == current_user.id)
        .options(selectinload(UserBook.book), selectinload(UserBook.tags))
    )
    count_q = select(func.count(UserBook.id)).where(
        UserBook.user_id == current_user.id
    )

    if status:
        if status not in VALID_STATUSES:
            raise ValidationException(f"Invalid status: {status}")
        base_q = base_q.where(UserBook.status == status)
        count_q = count_q.where(UserBook.status == status)

    if is_custom is not None:
        base_q = base_q.join(Book).where(Book.is_custom == is_custom)
        count_q = count_q.join(Book).where(Book.is_custom == is_custom)

    if book_id:
        try:
            book_uuid = uuid.UUID(book_id)
        except ValueError:
            raise ValidationException("Invalid book_id format")
        base_q = base_q.where(UserBook.book_id == book_uuid)
        count_q = count_q.where(UserBook.book_id == book_uuid)

    # Sort
    sort_map = {
        "created_at_desc": UserBook.created_at.desc(),
        "created_at_asc": UserBook.created_at.asc(),
        "rating_desc": UserBook.rating.desc().nulls_last(),
        "rating_asc": UserBook.rating.asc().nulls_last(),
    }
    order = sort_map.get(sort, UserBook.created_at.desc())
    base_q = base_q.order_by(order)

    # Count
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * per_page
    result = await db.execute(base_q.offset(offset).limit(per_page))
    user_books = list(result.scalars().all())

    data = [_user_book_to_response(ub) for ub in user_books]
    return paginated_response(data, page, per_page, total)


@router.post("")
async def add_book_to_shelf(
    body: UserBookCreate,
    current_user: CurrentUser,
    db: DBSession,
):
    """書籍を本棚に追加"""
    try:
        book_id = uuid.UUID(body.book_id)
    except ValueError:
        raise ValidationException("Invalid book_id format")

    # 書籍の存在確認
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    if not book:
        raise NotFoundException("Book not found")

    # カスタム書籍は作成者のみ追加可能
    if book.is_custom and book.created_by != current_user.id:
        raise CustomBookRestrictedException()

    # 重複チェック
    result = await db.execute(
        select(UserBook).where(
            UserBook.user_id == current_user.id,
            UserBook.book_id == book_id,
        )
    )
    if result.scalar_one_or_none():
        raise AlreadyExistsException("Book already in your shelf")

    user_book = UserBook(
        user_id=current_user.id,
        book_id=book_id,
        status=body.status,
        is_owned=body.is_owned,
    )
    db.add(user_book)
    await db.flush()

    # Reload with relationships
    result = await db.execute(
        select(UserBook)
        .where(UserBook.id == user_book.id)
        .options(selectinload(UserBook.book), selectinload(UserBook.tags))
    )
    user_book = result.scalar_one()
    return {"data": _user_book_to_response(user_book)}


@router.patch("/{user_book_id}")
async def update_user_book(
    user_book_id: uuid.UUID,
    body: UserBookUpdate,
    current_user: CurrentUser,
    db: DBSession,
):
    """ステータス・評価・メモの更新"""
    result = await db.execute(
        select(UserBook)
        .where(UserBook.id == user_book_id, UserBook.user_id == current_user.id)
        .options(selectinload(UserBook.book), selectinload(UserBook.tags))
    )
    user_book = result.scalar_one_or_none()
    if not user_book:
        raise NotFoundException("UserBook not found")

    update_data = body.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        if key in ("started_reading_at", "finished_reading_at") and value:
            try:
                value = date.fromisoformat(value)
            except ValueError:
                raise ValidationException(f"Invalid date format for {key}. Use YYYY-MM-DD.")
        setattr(user_book, key, value)

    return {"data": _user_book_to_response(user_book)}


@router.delete("/{user_book_id}", status_code=204)
async def remove_book_from_shelf(
    user_book_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """本棚から削除"""
    result = await db.execute(
        select(UserBook).where(
            UserBook.id == user_book_id,
            UserBook.user_id == current_user.id,
        )
    )
    user_book = result.scalar_one_or_none()
    if not user_book:
        raise NotFoundException("UserBook not found")

    await db.delete(user_book)


class TagAttach(BaseModel):
    tag_id: str


@router.post("/{user_book_id}/tags")
async def add_tag_to_book(
    user_book_id: uuid.UUID,
    body: TagAttach,
    current_user: CurrentUser,
    db: DBSession,
):
    """書籍にタグを付与"""
    result = await db.execute(
        select(UserBook)
        .where(UserBook.id == user_book_id, UserBook.user_id == current_user.id)
        .options(selectinload(UserBook.tags))
    )
    user_book = result.scalar_one_or_none()
    if not user_book:
        raise NotFoundException("UserBook not found")

    try:
        tag_id = uuid.UUID(body.tag_id)
    except ValueError:
        raise ValidationException("Invalid tag_id format")
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.user_id == current_user.id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise NotFoundException("Tag not found")

    # Check if already attached
    if tag in user_book.tags:
        raise AlreadyExistsException("Tag already attached")

    user_book.tags.append(tag)
    return {"data": {"id": str(tag.id), "name": tag.name}}


@router.delete("/{user_book_id}/tags/{tag_id}", status_code=204)
async def remove_tag_from_book(
    user_book_id: uuid.UUID,
    tag_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """書籍からタグを取り外す"""
    result = await db.execute(
        select(UserBook)
        .where(UserBook.id == user_book_id, UserBook.user_id == current_user.id)
        .options(selectinload(UserBook.tags))
    )
    user_book = result.scalar_one_or_none()
    if not user_book:
        raise NotFoundException("UserBook not found")

    tag_to_remove = None
    for tag in user_book.tags:
        if tag.id == tag_id:
            tag_to_remove = tag
            break

    if not tag_to_remove:
        raise NotFoundException("Tag not found on this book")

    user_book.tags.remove(tag_to_remove)
