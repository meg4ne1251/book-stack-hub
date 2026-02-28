"""画像ファイル名バリデーション（パストラバーサル対策）のテスト"""

import pytest

from app.routers.images import SAFE_FILENAME_PATTERN, _validate_filename
from app.utils.exceptions import ValidationException


class TestSafeFilenamePattern:
    """UUID.webp形式のファイル名バリデーション"""

    def test_valid_uuid_webp(self):
        """正規のUUID.webpファイル名"""
        _validate_filename("550e8400-e29b-41d4-a716-446655440000.webp")

    def test_valid_uuid_lowercase(self):
        """小文字UUIDが許可される"""
        _validate_filename("abcdef01-2345-6789-abcd-ef0123456789.webp")

    def test_path_traversal_rejected(self):
        """パストラバーサルが拒否される"""
        with pytest.raises(ValidationException):
            _validate_filename("../../../etc/passwd")

    def test_path_traversal_with_uuid_rejected(self):
        """UUID付きパストラバーサルが拒否される"""
        with pytest.raises(ValidationException):
            _validate_filename("../../550e8400-e29b-41d4-a716-446655440000.webp")

    def test_non_webp_extension_rejected(self):
        """webp以外の拡張子が拒否される"""
        with pytest.raises(ValidationException):
            _validate_filename("550e8400-e29b-41d4-a716-446655440000.png")

    def test_no_extension_rejected(self):
        """拡張子なしが拒否される"""
        with pytest.raises(ValidationException):
            _validate_filename("550e8400-e29b-41d4-a716-446655440000")

    def test_empty_string_rejected(self):
        """空文字列が拒否される"""
        with pytest.raises(ValidationException):
            _validate_filename("")

    def test_uppercase_uuid_rejected(self):
        """大文字UUIDが拒否される（小文字のみ許可）"""
        with pytest.raises(ValidationException):
            _validate_filename("550E8400-E29B-41D4-A716-446655440000.webp")

    def test_null_bytes_rejected(self):
        """ヌルバイトインジェクションが拒否される"""
        with pytest.raises(ValidationException):
            _validate_filename("550e8400-e29b-41d4-a716-446655440000.webp\x00.png")

    def test_directory_separator_rejected(self):
        """ディレクトリセパレータが拒否される"""
        with pytest.raises(ValidationException):
            _validate_filename("subdir/550e8400-e29b-41d4-a716-446655440000.webp")

    def test_double_extension_rejected(self):
        """二重拡張子が拒否される"""
        with pytest.raises(ValidationException):
            _validate_filename("550e8400-e29b-41d4-a716-446655440000.webp.php")

    def test_short_uuid_rejected(self):
        """短すぎるUUIDが拒否される"""
        with pytest.raises(ValidationException):
            _validate_filename("550e8400-e29b-41d4.webp")

    def test_pattern_matches_only_valid_uuid_format(self):
        """正規表現パターンが正しいUUID形式のみマッチ"""
        assert SAFE_FILENAME_PATTERN.match("550e8400-e29b-41d4-a716-446655440000.webp")
        assert not SAFE_FILENAME_PATTERN.match("not-a-uuid.webp")
        assert not SAFE_FILENAME_PATTERN.match("550e8400e29b41d4a716446655440000.webp")
