"""Google Books APIクライアント"""
import logging
from dataclasses import dataclass

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes"


@dataclass
class BookSearchResult:
    """外部API検索結果の統一データ構造"""
    isbn_10: str | None = None
    isbn_13: str | None = None
    title: str = ""
    subtitle: str | None = None
    authors: list[str] | None = None
    publisher: str | None = None
    published_date: str | None = None
    description: str | None = None
    page_count: int | None = None
    cover_image_url: str | None = None
    categories: list[str] | None = None
    language: str | None = None
    source: str = ""
    source_id: str | None = None


def _parse_google_books_item(item: dict) -> BookSearchResult:
    """Google Books APIレスポンスの1アイテムをパース"""
    info = item.get("volumeInfo", {})

    isbn_10 = None
    isbn_13 = None
    for identifier in info.get("industryIdentifiers", []):
        if identifier.get("type") == "ISBN_10":
            isbn_10 = identifier.get("identifier")
        elif identifier.get("type") == "ISBN_13":
            isbn_13 = identifier.get("identifier")

    cover_url = None
    image_links = info.get("imageLinks", {})
    if image_links:
        cover_url = image_links.get("thumbnail") or image_links.get("smallThumbnail")

    return BookSearchResult(
        isbn_10=isbn_10,
        isbn_13=isbn_13,
        title=info.get("title", ""),
        subtitle=info.get("subtitle"),
        authors=info.get("authors"),
        publisher=info.get("publisher"),
        published_date=info.get("publishedDate"),
        description=info.get("description"),
        page_count=info.get("pageCount"),
        cover_image_url=cover_url,
        categories=info.get("categories"),
        language=info.get("language"),
        source="google_books",
        source_id=item.get("id"),
    )


async def search_google_books(
    query: str | None = None,
    isbn: str | None = None,
    max_results: int = 20,
) -> list[BookSearchResult]:
    """Google Books APIで書籍を検索"""
    params: dict = {
        "maxResults": min(max_results, 40),
    }

    if settings.GOOGLE_BOOKS_API_KEY:
        params["key"] = settings.GOOGLE_BOOKS_API_KEY

    if isbn:
        params["q"] = f"isbn:{isbn}"
    elif query:
        params["q"] = query
    else:
        return []

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(GOOGLE_BOOKS_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        logger.warning("Google Books API timeout")
        return []
    except httpx.HTTPError as e:
        logger.error("Google Books API error: %s", e)
        return []

    items = data.get("items", [])
    return [_parse_google_books_item(item) for item in items]
