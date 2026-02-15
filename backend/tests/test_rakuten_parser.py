"""楽天APIパーサーのテスト"""
from app.services.rakuten_books import _parse_sales_date, _parse_genre, _parse_authors


def test_parse_sales_date_full():
    assert _parse_sales_date("2026年02月15日") == "2026-02-15"


def test_parse_sales_date_year_month():
    assert _parse_sales_date("2026年02月") == "2026-02-01"


def test_parse_sales_date_year_only():
    assert _parse_sales_date("2026年") == "2026-01-01"


def test_parse_sales_date_none():
    assert _parse_sales_date(None) is None


def test_parse_sales_date_invalid():
    assert _parse_sales_date("unknown") is None


def test_parse_genre_known():
    result = _parse_genre("001004008")
    assert "本" in result


def test_parse_genre_unknown():
    result = _parse_genre("999")
    assert "その他" in result


def test_parse_genre_multiple():
    result = _parse_genre("001/015")
    assert "本" in result
    assert "コミック" in result


def test_parse_genre_none():
    assert _parse_genre(None) == []


def test_parse_authors_slash():
    assert _parse_authors("著者A/著者B") == ["著者A", "著者B"]


def test_parse_authors_single():
    assert _parse_authors("単一著者") == ["単一著者"]


def test_parse_authors_none():
    assert _parse_authors(None) == []
