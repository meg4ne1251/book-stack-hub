"""認証サービスのユニットテスト（DB不要の部分）"""
import uuid

import pytest

from app.services.auth_service import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.utils.exceptions import TokenExpiredException, UnauthorizedException


def test_hash_and_verify_password():
    password = "TestPassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)


def test_verify_wrong_password():
    hashed = hash_password("CorrectPassword1!")
    assert not verify_password("WrongPassword1!", hashed)


def test_create_and_decode_access_token():
    user_id = uuid.uuid4()
    token = create_access_token(user_id, "user")
    payload = decode_access_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["role"] == "user"
    assert payload["type"] == "access"


def test_decode_invalid_token():
    with pytest.raises(UnauthorizedException):
        decode_access_token("invalid.token.here")


def test_hash_token_deterministic():
    token = "test_token_value"
    hash1 = hash_token(token)
    hash2 = hash_token(token)
    assert hash1 == hash2
    assert hash1 != token
