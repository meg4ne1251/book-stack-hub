"""ページネーションとレスポンスユーティリティのテスト"""
from app.utils.response import paginated_response


def test_paginated_response():
    result = paginated_response(
        data=[{"id": 1}, {"id": 2}],
        page=1,
        per_page=20,
        total=50,
    )
    assert result["data"] == [{"id": 1}, {"id": 2}]
    assert result["meta"]["page"] == 1
    assert result["meta"]["per_page"] == 20
    assert result["meta"]["total"] == 50
    assert result["meta"]["total_pages"] == 3


def test_paginated_response_exact_division():
    result = paginated_response(data=[], page=1, per_page=10, total=30)
    assert result["meta"]["total_pages"] == 3


def test_paginated_response_empty():
    result = paginated_response(data=[], page=1, per_page=20, total=0)
    assert result["meta"]["total_pages"] == 0
