from typing import Any


def paginated_response(
    data: list[Any],
    page: int,
    per_page: int,
    total: int,
) -> dict:
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
