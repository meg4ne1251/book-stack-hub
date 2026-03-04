"""書籍検索の統合サービス - 外部API + アプリ内検索"""
import asyncio
import logging
import uuid as uuid_mod

from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.book import Book
from app.services.google_books import BookSearchResult, search_google_books
from app.services.rakuten_books import search_rakuten_books

logger = logging.getLogger(__name__)


def _merge_results(
    rakuten_results: list[BookSearchResult],
    google_results: list[BookSearchResult],
) -> list[BookSearchResult]:
    """
    楽天 > Google Books の優先順位で結果を統合・重複排除。
    ISBN-13の一致をもって同一書籍とみなす。
    """
    merged: dict[str, BookSearchResult] = {}
    seen_titles: set[str] = set()

    # 楽天の結果を優先的に追加
    for item in rakuten_results:
        key = item.isbn_13 or f"rakuten:{item.source_id}"
        if key not in merged:
            merged[key] = item
            if item.title:
                seen_titles.add(item.title.lower())

    # Google Booksの結果を追加（ISBN重複を除外）
    for item in google_results:
        key = item.isbn_13 or f"google:{item.source_id}"
        if key in merged:
            # ISBN一致の場合、楽天データにGoogleデータで補完
            existing = merged[key]
            if not existing.description and item.description:
                existing.description = item.description
            if not existing.page_count and item.page_count:
                existing.page_count = item.page_count
            if not existing.cover_image_url and item.cover_image_url:
                existing.cover_image_url = item.cover_image_url
            if not existing.language and item.language:
                existing.language = item.language
            if not existing.subtitle and item.subtitle:
                existing.subtitle = item.subtitle
        else:
            # タイトル完全一致も重複とみなす（ISBN無しの場合）
            if item.title and item.title.lower() not in seen_titles:
                merged[key] = item
                seen_titles.add(item.title.lower())

    return list(merged.values())


async def search_external(
    query: str | None = None,
    isbn: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[BookSearchResult], int]:
    """
    外部APIで書籍を検索。
    キーワード検索: Google Books + 楽天を並行リクエスト
    ISBN検索: 楽天 → Google Booksの順
    全体タイムアウト: 10秒

    Returns: (ページ分の結果リスト, マージ後の総件数)
    """
    try:
        if isbn:
            # ISBN検索: 楽天優先、ヒットしなければGoogle
            results = await asyncio.wait_for(
                _search_isbn(isbn), timeout=10.0
            )
        else:
            # キーワード検索: 並行リクエスト（各APIから最大40件取得）
            results = await asyncio.wait_for(
                _search_keyword(query, max_results=40), timeout=10.0
            )
    except asyncio.TimeoutError:
        logger.warning("External search timeout (10s)")
        results = []

    total = len(results)

    # ページネーション（外部APIの結果に対して）
    start = (page - 1) * per_page
    end = start + per_page
    return results[start:end], total


async def _search_isbn(isbn: str) -> list[BookSearchResult]:
    """ISBN検索: 楽天 → Google Books"""
    # 楽天を先に試す
    rakuten_results = await search_rakuten_books(isbn=isbn)
    if rakuten_results:
        return rakuten_results

    # 楽天でヒットしなければGoogle Books
    google_results = await search_google_books(isbn=isbn)
    return google_results


async def _search_keyword(
    query: str | None, max_results: int
) -> list[BookSearchResult]:
    """キーワード検索: Google Books + 楽天を並行"""
    google_task = search_google_books(query=query, max_results=max_results)
    rakuten_task = search_rakuten_books(query=query, max_results=max_results)

    results = await asyncio.gather(
        google_task, rakuten_task, return_exceptions=True
    )

    google_results = results[0] if not isinstance(results[0], Exception) else []
    rakuten_results = results[1] if not isinstance(results[1], Exception) else []

    return _merge_results(rakuten_results, google_results)


async def search_internal(
    db: AsyncSession,
    query: str | None = None,
    isbn: str | None = None,
    user_id: str | uuid_mod.UUID | None = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[Book], int]:
    """
    アプリ内検索（DBに登録済みのマスター書籍 + 自分のカスタム書籍）
    PostgreSQLの pg_trgm + GIN index を利用
    """
    base_query = select(Book)
    count_query = select(func.count(Book.id))

    conditions = []

    if isbn:
        conditions.append(
            or_(Book.isbn_13 == isbn, Book.isbn_10 == isbn)
        )
    elif query:
        # pg_trgm similarity search
        like_pattern = f"%{query}%"
        conditions.append(
            or_(
                Book.title.ilike(like_pattern),
                Book.publisher.ilike(like_pattern),
                Book.isbn_13 == query,
                Book.isbn_10 == query,
            )
        )

    # カスタム書籍は自分のもののみ表示
    if user_id:
        uid = uuid_mod.UUID(str(user_id)) if not isinstance(user_id, uuid_mod.UUID) else user_id
        conditions.append(
            or_(
                Book.is_custom.is_(False),
                Book.created_by == uid,
            )
        )
    else:
        conditions.append(Book.is_custom.is_(False))

    if conditions:
        base_query = base_query.where(*conditions)
        count_query = count_query.where(*conditions)

    # Total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginated results
    offset = (page - 1) * per_page
    result = await db.execute(
        base_query.order_by(Book.title).offset(offset).limit(per_page)
    )
    books = list(result.scalars().all())

    return books, total
