"""ユーザー書籍API（本棚）"""
import uuid
from datetime import date

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DBSession
from app.models.book import Book
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
    "want_to_read", "unread", "tsundoku", "reading", "suspended", "finished"
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
    book_id = uuid.UUID(body.book_id)

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

    if body.status not in VALID_STATUSES:
        raise ValidationException(f"Invalid status: {body.status}")

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

    if "status" in update_data:
        if update_data["status"] not in VALID_STATUSES:
            raise ValidationException(f"Invalid status: {update_data['status']}")

    for key, value in update_data.items():
        if key in ("started_reading_at", "finished_reading_at") and value:
            value = date.fromisoformat(value)
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
