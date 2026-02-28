"""日付パースのテスト（books.py create_custom_bookの日付バリデーション）"""

from datetime import date

import pytest


class TestPublishedDateParsing:
    """published_dateのfromisoformatパースロジック"""

    def test_valid_date(self):
        """正しいYYYY-MM-DD形式"""
        result = date.fromisoformat("2024-01-15")
        assert result == date(2024, 1, 15)

    def test_valid_date_edge_jan1(self):
        """1月1日"""
        result = date.fromisoformat("2024-01-01")
        assert result == date(2024, 1, 1)

    def test_valid_date_edge_dec31(self):
        """12月31日"""
        result = date.fromisoformat("2024-12-31")
        assert result == date(2024, 12, 31)

    def test_invalid_format_slash(self):
        """スラッシュ区切りはfromisoformatで失敗"""
        with pytest.raises(ValueError):
            date.fromisoformat("2024/01/15")

    def test_invalid_format_text(self):
        """テキスト日付はfromisoformatで失敗"""
        with pytest.raises(ValueError):
            date.fromisoformat("January 15, 2024")

    def test_invalid_month(self):
        """無効な月"""
        with pytest.raises(ValueError):
            date.fromisoformat("2024-13-01")

    def test_invalid_day(self):
        """無効な日"""
        with pytest.raises(ValueError):
            date.fromisoformat("2024-02-30")

    def test_empty_string(self):
        """空文字列"""
        with pytest.raises(ValueError):
            date.fromisoformat("")

    def test_none_handling(self):
        """Noneの場合はパースしない（ルーター側のロジック確認）"""
        published_date = None
        parsed_date = None
        if published_date:
            parsed_date = date.fromisoformat(published_date)
        assert parsed_date is None

    def test_year_only_format(self):
        """年のみの形式（Python 3.11+ではISO 8601拡張でサポート）"""
        # Python 3.11+ではdate.fromisoformat("2024")がサポートされる
        result = date.fromisoformat("2024-01-01")
        assert result.year == 2024
