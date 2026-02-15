"""レビューAPI"""
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.dependencies import CurrentUser, DBSession
from app.models.review import Review
from app.utils.exceptions import AlreadyExistsException, NotFoundException
from app.utils.response import paginated_response

router = APIRouter(tags=["reviews"])


class ReviewCreate(BaseModel):
    book_id: str
    title: str = Field(max_length=100)
    body: str = Field(max_length=10000)
    is_public: bool = False


class ReviewUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=100)
    body: str | None = Field(default=None, max_length=10000)
    is_public: bool | None = None


def _review_to_response(review: Review) -> dict:
    return {
        "id": str(review.id),
        "user_id": str(review.user_id),
        "book_id": str(review.book_id),
        "title": review.title,
        "body": review.body,
        "is_public": review.is_public,
        "published_at": str(review.published_at) if review.published_at else None,
        "created_at": str(review.created_at),
        "updated_at": str(review.updated_at),
    }


me_router = APIRouter(prefix="/me/reviews", tags=["reviews"])
book_reviews_router = APIRouter(tags=["reviews"])


@me_router.post("")
async def create_review(
    body: ReviewCreate,
    current_user: CurrentUser,
    db: DBSession,
):
    """レビュー投稿"""
    book_id = uuid.UUID(body.book_id)

    # 1ユーザー1書籍1レビュー制約チェック
    result = await db.execute(
        select(Review).where(
            Review.user_id == current_user.id,
            Review.book_id == book_id,
        )
    )
    if result.scalar_one_or_none():
        raise AlreadyExistsException("You already reviewed this book")

    review = Review(
        user_id=current_user.id,
        book_id=book_id,
        title=body.title,
        body=body.body,
        is_public=body.is_public,
        published_at=datetime.now(UTC) if body.is_public else None,
    )
    db.add(review)
    await db.flush()

    return {"data": _review_to_response(review)}


@me_router.patch("/{review_id}")
async def update_review(
    review_id: uuid.UUID,
    body: ReviewUpdate,
    current_user: CurrentUser,
    db: DBSession,
):
    """レビュー編集"""
    result = await db.execute(
        select(Review).where(
            Review.id == review_id,
            Review.user_id == current_user.id,
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise NotFoundException("Review not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(review, key, value)

    # 公開に変更された場合、published_atを設定
    if "is_public" in update_data and update_data["is_public"] and not review.published_at:
        review.published_at = datetime.now(UTC)

    return {"data": _review_to_response(review)}


@me_router.delete("/{review_id}", status_code=204)
async def delete_review(
    review_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """レビュー削除"""
    result = await db.execute(
        select(Review).where(
            Review.id == review_id,
            Review.user_id == current_user.id,
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise NotFoundException("Review not found")

    await db.delete(review)


@book_reviews_router.get("/books/{book_id}/reviews")
async def list_book_reviews(
    book_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
):
    """書籍のレビュー一覧（公開のみ）"""
    count_q = select(func.count(Review.id)).where(
        Review.book_id == book_id,
        Review.is_public.is_(True),
    )
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    offset = (page - 1) * per_page
    result = await db.execute(
        select(Review)
        .where(Review.book_id == book_id, Review.is_public.is_(True))
        .order_by(Review.published_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    reviews = result.scalars().all()

    data = [_review_to_response(r) for r in reviews]
    return paginated_response(data, page, per_page, total)
