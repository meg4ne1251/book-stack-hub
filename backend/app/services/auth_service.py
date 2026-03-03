import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import httpx
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.token import PasswordResetToken, RefreshToken
from app.models.user import User
from app.utils.exceptions import (
    AlreadyExistsException,
    InvalidCredentialsException,
    UnauthorizedException,
    ValidationException,
)

ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_access_token(user_id: uuid.UUID, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.now(UTC),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise UnauthorizedException("Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        from app.utils.exceptions import TokenExpiredException
        raise TokenExpiredException()
    except jwt.InvalidTokenError:
        raise UnauthorizedException("Invalid token")


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(64)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def save_refresh_token(
    db: AsyncSession, user_id: uuid.UUID, token: str
) -> None:
    token_hash = hash_token(token)
    expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(refresh_token)


async def verify_refresh_token(
    db: AsyncSession, token: str
) -> RefreshToken | None:
    token_hash = hash_token(token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.expires_at > datetime.now(UTC),
        )
    )
    return result.scalar_one_or_none()


async def revoke_refresh_token(db: AsyncSession, token: str) -> None:
    token_hash = hash_token(token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)


async def verify_turnstile(token: str) -> bool:
    if settings.DEV_MODE and not settings.TURNSTILE_SECRET_KEY:
        return True

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={
                "secret": settings.TURNSTILE_SECRET_KEY,
                "response": token,
            },
            timeout=5.0,
        )
        result = response.json()
        return result.get("success", False)


async def register_user(
    db: AsyncSession,
    email: str,
    username: str,
    display_name: str,
    password: str,
) -> User:
    # Check email uniqueness
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise AlreadyExistsException("このメールアドレスは既に登録されています")

    # Check username uniqueness
    result = await db.execute(select(User).where(User.username == username))
    if result.scalar_one_or_none():
        raise AlreadyExistsException("このユーザー名は既に使用されています")

    user = User(
        email=email,
        username=username,
        display_name=display_name,
        password_hash=hash_password(password),
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise InvalidCredentialsException()

    if not user.is_active:
        if user.deactivated_at:
            raise ValidationException(
                "Account is scheduled for deletion. Contact admin to restore."
            )
        raise ValidationException("Account is disabled")

    return user


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


def generate_password_reset_token() -> str:
    return secrets.token_urlsafe(32)


async def save_password_reset_token(
    db: AsyncSession, user_id: uuid.UUID, token: str
) -> None:
    token_hash = hash_token(token)
    expires_at = datetime.now(UTC) + timedelta(hours=1)
    reset_token = PasswordResetToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(reset_token)


async def verify_password_reset_token(
    db: AsyncSession, token: str
) -> PasswordResetToken | None:
    token_hash = hash_token(token)
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.expires_at > datetime.now(UTC),
            PasswordResetToken.used_at.is_(None),
        )
    )
    return result.scalar_one_or_none()
