"""統計・レポート API"""

from datetime import date, datetime

from fastapi import APIRouter, Query
from sqlalchemy import func, select, extract, and_

from app.dependencies import CurrentUser, DBSession
from app.models.user_book import UserBook
from app.models.book import Book
from app.models.reading_log import ReadingLog

router = APIRouter(prefix="/me/stats", tags=["stats"])


@router.get("/overview")
async def get_stats_overview(
    current_user: CurrentUser,
    db: DBSession,
):
    """ダッシュボード統計"""
    now = datetime.utcnow()
    current_year = now.year
    current_month = now.month

    # Total books in shelf
    total_books = await db.scalar(
        select(func.count(UserBook.id)).where(UserBook.user_id == current_user.id)
    )

    # Books finished this month
    books_this_month = await db.scalar(
        select(func.count(UserBook.id)).where(
            and_(
                UserBook.user_id == current_user.id,
                UserBook.status == "finished",
                extract("year", UserBook.finished_reading_at) == current_year,
                extract("month", UserBook.finished_reading_at) == current_month,
            )
        )
    )

    # Books finished this year
    books_this_year = await db.scalar(
        select(func.count(UserBook.id)).where(
            and_(
                UserBook.user_id == current_user.id,
                UserBook.status == "finished",
                extract("year", UserBook.finished_reading_at) == current_year,
            )
        )
    )

    # Total pages this year from reading logs
    total_pages_this_year = await db.scalar(
        select(func.coalesce(func.sum(ReadingLog.pages_read), 0)).where(
            and_(
                ReadingLog.user_id == current_user.id,
                extract("year", ReadingLog.read_date) == current_year,
            )
        )
    )

    # Status counts
    status_result = await db.execute(
        select(UserBook.status, func.count(UserBook.id))
        .where(UserBook.user_id == current_user.id)
        .group_by(UserBook.status)
    )
    status_counts = {row[0]: row[1] for row in status_result.all()}

    # Monthly finished books (current year)
    monthly_result = await db.execute(
        select(
            extract("month", UserBook.finished_reading_at).label("month"),
            func.count(UserBook.id),
        )
        .where(
            and_(
                UserBook.user_id == current_user.id,
                UserBook.status == "finished",
                extract("year", UserBook.finished_reading_at) == current_year,
            )
        )
        .group_by("month")
        .order_by("month")
    )
    monthly_data = {int(row[0]): row[1] for row in monthly_result.all()}
    monthly_finished = [
        {"month": f"{current_year}-{m:02d}", "count": monthly_data.get(m, 0)}
        for m in range(1, 13)
    ]

    # Genre distribution (from books in shelf)
    genre_result = await db.execute(
        select(
            func.unnest(Book.categories).label("genre"),
            func.count().label("cnt"),
        )
        .join(UserBook, UserBook.book_id == Book.id)
        .where(UserBook.user_id == current_user.id)
        .group_by("genre")
        .order_by(func.count().desc())
        .limit(10)
    )
    genre_distribution = [
        {"genre": row[0], "count": row[1]} for row in genre_result.all()
    ]

    # Monthly spending (current year)
    spending_result = await db.execute(
        select(
            extract("month", UserBook.created_at).label("month"),
            func.coalesce(func.sum(UserBook.purchase_price), 0),
        )
        .where(
            and_(
                UserBook.user_id == current_user.id,
                extract("year", UserBook.created_at) == current_year,
                UserBook.purchase_price.isnot(None),
            )
        )
        .group_by("month")
        .order_by("month")
    )
    spending_data = {int(row[0]): float(row[1]) for row in spending_result.all()}
    monthly_spending = [
        {"month": f"{current_year}-{m:02d}", "amount": spending_data.get(m, 0)}
        for m in range(1, 13)
    ]

    return {
        "total_books": total_books or 0,
        "books_this_month": books_this_month or 0,
        "books_this_year": books_this_year or 0,
        "total_pages_this_year": total_pages_this_year or 0,
        "status_counts": status_counts,
        "monthly_finished": monthly_finished,
        "genre_distribution": genre_distribution,
        "monthly_spending": monthly_spending,
    }
