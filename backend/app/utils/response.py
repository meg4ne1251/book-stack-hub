from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.models.book import Book


def paginated_response(
    data: list[Any],
    page: int,
    per_page: int,
    total: int,
) -> dict[str, Any]:
    """ページネーション付きレスポンスを生成"""
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    return {
        "data": data,
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        },
    }


def book_to_response(book: Book) -> dict[str, Any]:
    """Bookモデルをレスポンスdictに変換（署名付きURL付き）"""
    from app.services.image_service import generate_signed_url

    cover_url = book.cover_image_url

    # ローカル保存の画像（カスタム書籍など）は署名付きURLに変換
    if cover_url and not cover_url.startswith(("http://", "https://")):
        cover_url = generate_signed_url(cover_url)

    return {
        "id": str(book.id),
        "isbn_10": book.isbn_10,
        "isbn_13": book.isbn_13,
        "title": book.title,
        "subtitle": book.subtitle,
        "series_title": book.series_title,
        "volume_number": book.volume_number,
        "authors": book.authors or [],
        "publisher": book.publisher,
        "published_date": str(book.published_date) if book.published_date else None,
        "description": book.description,
        "page_count": book.page_count,
        "cover_image_url": cover_url,
        "categories": book.categories or [],
        "language": book.language,
        "source": book.source,
        "is_custom": book.is_custom,
    }
