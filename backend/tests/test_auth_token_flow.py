"""認証サービスのユニットテスト（追加分: トークン生成・検証フロー）"""
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.auth_service import (
    create_access_token,
    decode_access_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.utils.exceptions import TokenExpiredException, UnauthorizedException


class TestAccessTokenFlow:
    """アクセストークン生成・検証フロー"""

    def test_create_and_decode(self):
        """正常なアクセストークンの生成と復号"""
        user_id = uuid.uuid4()
        token = create_access_token(user_id, "user")
        payload = decode_access_token(token)

        assert payload["sub"] == str(user_id)
        assert payload["role"] == "user"
        assert payload["type"] == "access"

    def test_decode_invalid_token(self):
        """不正なトークンの復号でUnauthorized"""
        with pytest.raises(UnauthorizedException):
            decode_access_token("invalid.token.here")

    def test_decode_expired_token(self):
        """期限切れトークンでTokenExpired"""
        import jwt
        from app.config import settings

        payload = {
            "sub": str(uuid.uuid4()),
            "role": "user",
            "exp": datetime.now(UTC) - timedelta(hours=1),
            "iat": datetime.now(UTC) - timedelta(hours=2),
            "type": "access",
        }
        expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

        with pytest.raises(TokenExpiredException):
            decode_access_token(expired_token)

    def test_decode_wrong_type(self):
        """typeがaccessでないトークンはUnauthorized"""
        import jwt
        from app.config import settings

        payload = {
            "sub": str(uuid.uuid4()),
            "role": "user",
            "exp": datetime.now(UTC) + timedelta(hours=1),
            "iat": datetime.now(UTC),
            "type": "refresh",  # Wrong type
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

        with pytest.raises(UnauthorizedException):
            decode_access_token(token)

    def test_admin_role_in_token(self):
        """adminロールのトークン生成"""
        user_id = uuid.uuid4()
        token = create_access_token(user_id, "admin")
        payload = decode_access_token(token)

        assert payload["role"] == "admin"


class TestPasswordHashing:
    """パスワードハッシュの完全性テスト"""

    def test_hash_and_verify(self):
        """正しいパスワードの検証"""
        password = "TestPass123!"
        hashed = hash_password(password)
        assert verify_password(password, hashed)

    def test_wrong_password(self):
        """間違ったパスワードの検証"""
        hashed = hash_password("Correct123!")
        assert not verify_password("Wrong123!", hashed)

    def test_hash_uniqueness(self):
        """同じパスワードでもハッシュは毎回異なる（salt）"""
        password = "TestPass123!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        assert hash1 != hash2

    def test_empty_password_hash(self):
        """空文字列でもハッシュ化は可能（バリデーションは別レイヤー）"""
        hashed = hash_password("")
        assert verify_password("", hashed)


class TestTokenHashing:
    """トークンSHA-256ハッシュ"""

    def test_consistent_hash(self):
        """同じ入力に対して同じハッシュを返す"""
        token = "test-token-value"
        assert hash_token(token) == hash_token(token)

    def test_different_tokens(self):
        """異なるトークンは異なるハッシュ"""
        assert hash_token("token-a") != hash_token("token-b")

    def test_hash_length(self):
        """SHA-256ハッシュのHex文字列は64文字"""
        assert len(hash_token("any-token")) == 64
