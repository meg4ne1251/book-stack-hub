"""Pydanticスキーマのバリデーションテスト"""
import pytest
from pydantic import ValidationError

from app.schemas.auth import RegisterRequest, LoginRequest


def test_register_valid():
    req = RegisterRequest(
        email="test@example.com",
        username="testuser",
        display_name="Test User",
        password="TestPass123!",
        turnstile_token="dummy",
    )
    assert req.email == "test@example.com"
    assert req.username == "testuser"


def test_register_invalid_email():
    with pytest.raises(ValidationError):
        RegisterRequest(
            email="not-an-email",
            username="testuser",
            display_name="Test",
            password="TestPass123!",
            turnstile_token="dummy",
        )


def test_register_username_special_chars():
    with pytest.raises(ValidationError):
        RegisterRequest(
            email="test@example.com",
            username="test user!",
            display_name="Test",
            password="TestPass123!",
            turnstile_token="dummy",
        )


def test_register_username_underscore_allowed():
    req = RegisterRequest(
        email="test@example.com",
        username="test_user_123",
        display_name="Test",
        password="TestPass123!",
        turnstile_token="dummy",
    )
    assert req.username == "test_user_123"


def test_register_username_too_short():
    with pytest.raises(ValidationError):
        RegisterRequest(
            email="test@example.com",
            username="ab",
            display_name="Test",
            password="TestPass123!",
            turnstile_token="dummy",
        )


def test_register_password_too_weak():
    """3種類未満の文字種ではバリデーションエラー"""
    with pytest.raises(ValidationError):
        RegisterRequest(
            email="test@example.com",
            username="testuser",
            display_name="Test",
            password="onlylowercase",
            turnstile_token="dummy",
        )


def test_register_password_two_categories():
    """2種類の文字種ではバリデーションエラー"""
    with pytest.raises(ValidationError):
        RegisterRequest(
            email="test@example.com",
            username="testuser",
            display_name="Test",
            password="lowercase123",
            turnstile_token="dummy",
        )


def test_register_password_three_categories_ok():
    """3種類の文字種はOK"""
    req = RegisterRequest(
        email="test@example.com",
        username="testuser",
        display_name="Test",
        password="Lower123upper",
        turnstile_token="dummy",
    )
    assert req.password == "Lower123upper"


def test_login_valid():
    req = LoginRequest(
        email="test@example.com",
        password="password",
        turnstile_token="dummy",
    )
    assert req.email == "test@example.com"
