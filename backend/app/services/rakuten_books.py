"""楽天ブックスAPIクライアント + Redisトークンバケットによるレート制御"""
import asyncio
import logging
import re
from dataclasses import dataclass

import httpx

from app.config import settings
from app.services.google_books import BookSearchResult
from app.utils.redis import redis_client

logger = logging.getLogger(__name__)

RAKUTEN_BOOKS_API_URL = (
    "https://app.rakuten.co.jp/services/api/BooksTotal/Search/20170404"
)

# 楽天ジャンルIDマッピング（フェーズ1定数）
GENRE_MAP = {
    "001": "本",
    "002": "CD・DVD",
    "003": "洋書",
    "004": "雑誌",
    "005": "ゲーム",
    "006": "PC・周辺機器",
    "007": "ソフトウェア",
    "015": "コミック",
    "101": "電子書籍",
}

RATE_LIMIT_KEY = "rate_limit:rakuten_api"


async def _acquire_token(block: bool = True, timeout: float = 10.0) -> bool:
    """
    Redisトークンバケットでレートリミットを制御。
    1秒あたり1リクエスト。
    block=True: トークンが取得できるまで非同期で待機。
    block=False: 即座にFalseを返す（Celeryバッチ用）。
    """
    elapsed = 0.0
    while True:
        # Try to acquire token with SETNX + EXPIRE
        acquired = await redis_client.set(
            RATE_LIMIT_KEY, "1", nx=True, ex=1
        )
        if acquired:
            return True

        if not block:
            return False

        if elapsed >= timeout:
            return False

        await asyncio.sleep(0.1)
        elapsed += 0.1


def _parse_sales_date(sales_date: str | None) -> str | None:
    """楽天の salesDate（例: '2026年02月15日'）をISO形式にパース"""
    if not sales_date:
        return None
    match = re.match(r"(\d{4})年(\d{1,2})月(\d{1,2})日", sales_date)
    if match:
        return f"{match.group(1)}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"

    # 「2026年02月」形式
    match = re.match(r"(\d{4})年(\d{1,2})月", sales_date)
    if match:
        return f"{match.group(1)}-{int(match.group(2)):02d}-01"

    # 「2026年」形式
    match = re.match(r"(\d{4})年", sales_date)
    if match:
        return f"{match.group(1)}-01-01"

    return None


def _parse_genre(genre_id: str | None) -> list[str]:
    """楽天ジャンルIDをカテゴリ名に変換"""
    if not genre_id:
        return []
    categories = set()
    for gid in genre_id.split("/"):
        top_level = gid[:3] if len(gid) >= 3 else gid
        categories.add(GENRE_MAP.get(top_level, "その他"))
    return list(categories)


def _parse_authors(author: str | None) -> list[str]:
    """楽天のauthor（スラッシュ区切り）をリストに変換"""
    if not author:
        return []
    return [a.strip() for a in author.split("/") if a.strip()]


def _parse_rakuten_item(item: dict) -> BookSearchResult:
    """楽天ブックスAPIレスポンスの1アイテムをパース"""
    return BookSearchResult(
        isbn_13=item.get("isbn"),
        title=item.get("title", ""),
        subtitle=item.get("subTitle"),
        authors=_parse_authors(item.get("author")),
        publisher=item.get("publisherName"),
        published_date=_parse_sales_date(item.get("salesDate")),
        description=item.get("itemCaption"),
        cover_image_url=item.get("largeImageUrl"),
        categories=_parse_genre(item.get("booksGenreId")),
        source="rakuten",
        source_id=item.get("itemCode"),
    )


async def search_rakuten_books(
    query: str | None = None,
    isbn: str | None = None,
    max_results: int = 20,
    block_for_token: bool = True,
) -> list[BookSearchResult]:
    """楽天ブックスAPIで書籍を検索"""
    if not settings.RAKUTEN_APP_ID:
        logger.warning("RAKUTEN_APP_ID not configured")
        return []

    # Acquire rate limit token
    acquired = await _acquire_token(block=block_for_token)
    if not acquired:
        logger.warning("Rakuten API rate limit: token not acquired")
        return []

    params: dict = {
        "applicationId": settings.RAKUTEN_APP_ID,
        "hits": min(max_results, 30),
        "outOfStockFlag": 1,
    }

    if settings.RAKUTEN_AFFILIATE_ID:
        params["affiliateId"] = settings.RAKUTEN_AFFILIATE_ID

    if isbn:
        params["isbnjan"] = isbn
    elif query:
        params["keyword"] = query
    else:
        return []

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(RAKUTEN_BOOKS_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        logger.warning("Rakuten Books API timeout")
        return []
    except httpx.HTTPError as e:
        logger.error("Rakuten Books API error: %s", e)
        return []

    items = data.get("Items", [])
    return [_parse_rakuten_item(item.get("Item", item)) for item in items]
