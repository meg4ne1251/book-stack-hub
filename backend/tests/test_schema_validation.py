"""Pydanticスキーマバリデーションのテスト（修正対象スキーマ）"""

import pytest
from pydantic import ValidationError


class TestProfileUpdate:
    """users.py ProfileUpdateスキーマのテスト"""

    def _make(self, **kwargs):
        from app.routers.users import ProfileUpdate
        return ProfileUpdate(**kwargs)

    def test_all_fields_optional(self):
        """全フィールドがオプション"""
        profile = self._make()
        assert profile.model_dump(exclude_unset=True) == {}

    def test_display_name_max_length(self):
        """display_nameの最大長（50文字）"""
        profile = self._make(display_name="a" * 50)
        assert profile.display_name == "a" * 50

    def test_display_name_too_long(self):
        """display_name超過でエラー"""
        with pytest.raises(ValidationError):
            self._make(display_name="a" * 51)

    def test_bio_max_length(self):
        """bioの最大長（500文字）"""
        profile = self._make(bio="x" * 500)
        assert profile.bio == "x" * 500

    def test_bio_too_long(self):
        """bio超過でエラー"""
        with pytest.raises(ValidationError):
            self._make(bio="x" * 501)

    def test_locale_max_length(self):
        """localeの最大長（5文字）"""
        profile = self._make(locale="ja-JP")
        assert profile.locale == "ja-JP"

    def test_locale_too_long(self):
        """locale超過でエラー"""
        with pytest.raises(ValidationError):
            self._make(locale="ja-JP-extra")

    def test_is_profile_public_bool(self):
        """is_profile_publicがbool"""
        profile = self._make(is_profile_public=True)
        assert profile.is_profile_public is True

    def test_exclude_unset_partial(self):
        """exclude_unsetで未設定フィールドが除外される"""
        profile = self._make(display_name="New Name")
        dump = profile.model_dump(exclude_unset=True)
        assert dump == {"display_name": "New Name"}
        assert "bio" not in dump
        assert "locale" not in dump


class TestAdminUserUpdate:
    """admin.py AdminUserUpdateスキーマのテスト"""

    def _make(self, **kwargs):
        from app.routers.admin import AdminUserUpdate
        return AdminUserUpdate(**kwargs)

    def test_empty_update(self):
        """空更新が許可される"""
        update = self._make()
        assert update.model_dump(exclude_unset=True) == {}

    def test_role_user(self):
        """role='user'が許可される"""
        update = self._make(role="user")
        assert update.role == "user"

    def test_role_admin(self):
        """role='admin'が許可される"""
        update = self._make(role="admin")
        assert update.role == "admin"

    def test_role_invalid(self):
        """不正なroleが拒否される"""
        with pytest.raises(ValidationError):
            self._make(role="superadmin")

    def test_role_moderator_rejected(self):
        """'moderator'ロールが拒否される"""
        with pytest.raises(ValidationError):
            self._make(role="moderator")

    def test_is_active_bool(self):
        """is_activeがbool"""
        update = self._make(is_active=False)
        assert update.is_active is False

    def test_both_fields(self):
        """両フィールドの同時設定"""
        update = self._make(is_active=True, role="admin")
        assert update.is_active is True
        assert update.role == "admin"


class TestAdminVisibilityUpdate:
    """admin.py AdminVisibilityUpdateスキーマのテスト"""

    def _make(self, **kwargs):
        from app.routers.admin import AdminVisibilityUpdate
        return AdminVisibilityUpdate(**kwargs)

    def test_is_public_required(self):
        """is_publicが必須"""
        with pytest.raises(ValidationError):
            self._make()

    def test_is_public_true(self):
        update = self._make(is_public=True)
        assert update.is_public is True

    def test_is_public_false(self):
        update = self._make(is_public=False)
        assert update.is_public is False


class TestExportRequest:
    """data.py ExportRequestスキーマのテスト"""

    def _make(self, **kwargs):
        from app.routers.data import ExportRequest
        return ExportRequest(**kwargs)

    def test_defaults(self):
        """デフォルト値"""
        req = self._make()
        assert req.format == "csv"
        assert req.include_images is False

    def test_format_csv(self):
        req = self._make(format="csv")
        assert req.format == "csv"

    def test_format_json(self):
        req = self._make(format="json")
        assert req.format == "json"

    def test_format_invalid(self):
        """不正なフォーマットが拒否される"""
        with pytest.raises(ValidationError):
            self._make(format="xml")

    def test_format_excel_rejected(self):
        """excelフォーマットが拒否される"""
        with pytest.raises(ValidationError):
            self._make(format="excel")

    def test_include_images_true(self):
        req = self._make(include_images=True)
        assert req.include_images is True
