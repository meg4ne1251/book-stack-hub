"""パスワードバリデーション共通関数のテスト"""
import pytest

from app.schemas.auth import (
    ChangePasswordRequest,
    RegisterRequest,
    ResetPasswordRequest,
    validate_password_strength,
)
from pydantic import ValidationError


class TestValidatePasswordStrength:
    """共通パスワード強度バリデーションのテスト"""

    def test_three_categories_lowercase_uppercase_digit(self):
        result = validate_password_strength("Abcdef1x")
        assert result == "Abcdef1x"

    def test_three_categories_lowercase_uppercase_special(self):
        result = validate_password_strength("Abcdef!x")
        assert result == "Abcdef!x"

    def test_three_categories_lowercase_digit_special(self):
        result = validate_password_strength("abcdef1!")
        assert result == "abcdef1!"

    def test_three_categories_uppercase_digit_special(self):
        result = validate_password_strength("ABCDEF1!")
        assert result == "ABCDEF1!"

    def test_four_categories(self):
        result = validate_password_strength("Abc123!x")
        assert result == "Abc123!x"

    def test_only_lowercase_fails(self):
        with pytest.raises(ValueError, match="at least 3"):
            validate_password_strength("onlylowercase")

    def test_two_categories_fails(self):
        with pytest.raises(ValueError, match="at least 3"):
            validate_password_strength("lowercase123")

    def test_two_categories_upper_lower_fails(self):
        with pytest.raises(ValueError, match="at least 3"):
            validate_password_strength("LowerUpper")

    def test_empty_string_fails(self):
        with pytest.raises(ValueError, match="at least 3"):
            validate_password_strength("")


class TestPasswordValidationAcrossSchemas:
    """全スキーマでパスワードバリデーションが統一的に動作するテスト"""

    def test_register_weak_password_rejected(self):
        with pytest.raises(ValidationError):
            RegisterRequest(
                email="test@example.com",
                username="testuser",
                display_name="Test",
                password="weakpass1",
                turnstile_token="dummy",
            )

    def test_register_strong_password_accepted(self):
        req = RegisterRequest(
            email="test@example.com",
            username="testuser",
            display_name="Test",
            password="Strong1!pass",
            turnstile_token="dummy",
        )
        assert req.password == "Strong1!pass"

    def test_reset_password_weak_rejected(self):
        with pytest.raises(ValidationError):
            ResetPasswordRequest(
                token="some-token",
                new_password="weakpass1",
            )

    def test_reset_password_strong_accepted(self):
        req = ResetPasswordRequest(
            token="some-token",
            new_password="Strong1!pass",
        )
        assert req.new_password == "Strong1!pass"

    def test_change_password_weak_rejected(self):
        with pytest.raises(ValidationError):
            ChangePasswordRequest(
                current_password="anything",
                new_password="weakpass1",
            )

    def test_change_password_strong_accepted(self):
        req = ChangePasswordRequest(
            current_password="anything",
            new_password="Strong1!pass",
        )
        assert req.new_password == "Strong1!pass"

    def test_change_password_min_length(self):
        with pytest.raises(ValidationError):
            ChangePasswordRequest(
                current_password="anything",
                new_password="Sh1!",
            )
