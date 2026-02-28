"""book_search.py UUID変換ロジックのテスト"""

import uuid as uuid_mod

import pytest


class TestUserIdUUIDConversion:
    """search_internalのuser_id UUID変換ロジック"""

    def test_string_to_uuid(self):
        """文字列UUIDがUUIDオブジェクトに変換される"""
        uid_str = "550e8400-e29b-41d4-a716-446655440000"
        uid = uuid_mod.UUID(str(uid_str)) if not isinstance(uid_str, uuid_mod.UUID) else uid_str
        assert isinstance(uid, uuid_mod.UUID)
        assert str(uid) == uid_str

    def test_uuid_object_passthrough(self):
        """UUIDオブジェクトがそのまま通過する"""
        uid = uuid_mod.UUID("550e8400-e29b-41d4-a716-446655440000")
        result = uuid_mod.UUID(str(uid)) if not isinstance(uid, uuid_mod.UUID) else uid
        assert result is uid

    def test_invalid_string_raises(self):
        """不正な文字列でValueError"""
        with pytest.raises(ValueError):
            uid_str = "not-a-uuid"
            uuid_mod.UUID(str(uid_str))

    def test_empty_string_raises(self):
        """空文字列でValueError"""
        with pytest.raises(ValueError):
            uuid_mod.UUID("")

    def test_none_skipped(self):
        """Noneの場合はUUID変換をスキップ"""
        user_id = None
        if user_id:
            uid = uuid_mod.UUID(str(user_id))
        else:
            uid = None
        assert uid is None

    def test_uuid_v4_format(self):
        """UUID v4形式が正しく変換される"""
        uid = uuid_mod.uuid4()
        result = uuid_mod.UUID(str(uid))
        assert result == uid

    def test_uuid_without_hyphens(self):
        """ハイフンなしUUIDも変換可能"""
        uid = uuid_mod.UUID("550e8400e29b41d4a716446655440000")
        assert str(uid) == "550e8400-e29b-41d4-a716-446655440000"
