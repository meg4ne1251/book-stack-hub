import logging
import uuid

from fastapi import APIRouter, Request, Response

from app.dependencies import CurrentUser, DBSession
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshResponse,
    RegisterRequest,
    ResetPasswordRequest,
    UserResponse,
)
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    decode_access_token,
    generate_password_reset_token,
    generate_refresh_token,
    get_user_by_id,
    hash_password,
    register_user,
    revoke_refresh_token,
    save_password_reset_token,
    save_refresh_token,
    verify_password_reset_token,
    verify_refresh_token,
    verify_turnstile,
)
from app.utils.exceptions import (
    RateLimitExceededException,
    UnauthorizedException,
    ValidationException,
)
from app.utils.rate_limit import check_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_TOKEN_COOKIE = "refresh_token"
COOKIE_MAX_AGE = 30 * 24 * 60 * 60  # 30 days


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        path="/api/v1/auth",
    )


@router.post("/register", response_model=AuthResponse)
async def register(
    body: RegisterRequest,
    response: Response,
    db: DBSession,
):
    # Turnstile verification
    if not await verify_turnstile(body.turnstile_token):
        raise ValidationException("Bot verification failed")

    user = await register_user(
        db,
        email=body.email,
        username=body.username,
        display_name=body.display_name,
        password=body.password,
    )

    access_token = create_access_token(user.id, user.role)
    refresh_token = generate_refresh_token()
    await save_refresh_token(db, user.id, refresh_token)
    _set_refresh_cookie(response, refresh_token)

    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: DBSession,
):
    # Rate limit: 10 requests/min per IP
    client_ip = request.client.host if request.client else "unknown"
    allowed = await check_rate_limit(
        f"rate_limit:login:{client_ip}", max_requests=10, window_seconds=60
    )
    if not allowed:
        raise RateLimitExceededException()

    # Turnstile verification
    if not await verify_turnstile(body.turnstile_token):
        raise ValidationException("Bot verification failed")

    user = await authenticate_user(db, body.email, body.password)

    access_token = create_access_token(user.id, user.role)
    refresh_token = generate_refresh_token()
    await save_refresh_token(db, user.id, refresh_token)
    _set_refresh_cookie(response, refresh_token)

    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    db: DBSession,
):
    token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if token:
        await revoke_refresh_token(db, token)
    _clear_refresh_cookie(response)


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    request: Request,
    response: Response,
    db: DBSession,
):
    token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not token:
        raise UnauthorizedException("No refresh token")

    stored_token = await verify_refresh_token(db, token)
    if not stored_token:
        _clear_refresh_cookie(response)
        raise UnauthorizedException("Invalid or expired refresh token")

    user = await get_user_by_id(db, stored_token.user_id)
    if not user or not user.is_active:
        _clear_refresh_cookie(response)
        raise UnauthorizedException("User not found or inactive")

    # Rotate refresh token
    await revoke_refresh_token(db, token)
    new_refresh_token = generate_refresh_token()
    await save_refresh_token(db, user.id, new_refresh_token)
    _set_refresh_cookie(response, new_refresh_token)

    access_token = create_access_token(user.id, user.role)
    return RefreshResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: CurrentUser,
):
    return UserResponse.model_validate(current_user)


@router.post("/forgot-password", status_code=204)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: DBSession,
):
    from sqlalchemy import select
    from app.models.user import User

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Always return 204 to prevent email enumeration
    if not user:
        return

    token = generate_password_reset_token()
    await save_password_reset_token(db, user.id, token)

    # TODO: Send email via AWS SES in Phase B5
    logger.info("Password reset token generated for user %s", user.id)


@router.get("/verify-reset-token")
async def verify_reset_token_endpoint(
    token: str,
    db: DBSession,
):
    reset_token = await verify_password_reset_token(db, token)
    if not reset_token:
        raise ValidationException("Invalid or expired reset token")
    return {"valid": True}


@router.post("/reset-password", status_code=204)
async def reset_password(
    body: ResetPasswordRequest,
    db: DBSession,
):
    from datetime import UTC, datetime

    reset_token = await verify_password_reset_token(db, body.token)
    if not reset_token:
        raise ValidationException("Invalid or expired reset token")

    user = await get_user_by_id(db, reset_token.user_id)
    if not user:
        raise ValidationException("User not found")

    user.password_hash = hash_password(body.new_password)
    reset_token.used_at = datetime.now(UTC)
