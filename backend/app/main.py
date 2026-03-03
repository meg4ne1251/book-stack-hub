import logging
import sys
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.utils.exceptions import AppException
from app.routers import (
    admin, auth, books, data, health, images, playlists,
    reading_logs, reviews, stats, tags, tasks, user_books, users,
)

# JSON structured logging
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp":"%(asctime)s","level":"%(levelname)s","name":"%(name)s","message":"%(message)s"}',
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


async def _create_initial_admin() -> None:
    """初期管理者を冪等に作成"""
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        return

    from sqlalchemy import select
    from app.database import async_session_factory
    from app.models.user import User
    from app.services.auth_service import hash_password

    async with async_session_factory() as session:
        result = await session.execute(
            select(User).where(User.email == settings.ADMIN_EMAIL)
        )
        if result.scalar_one_or_none():
            logger.info("Admin user already exists, skipping creation")
            return

        admin = User(
            email=settings.ADMIN_EMAIL,
            username="admin",
            display_name="Administrator",
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            role="admin",
        )
        session.add(admin)
        await session.commit()
        logger.info("Initial admin user created: %s", settings.ADMIN_EMAIL)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("BookStackHub backend starting up")
    try:
        await _create_initial_admin()
    except Exception as e:
        logger.warning("Failed to create initial admin (DB may not be ready): %s", e)
    yield
    logger.info("BookStackHub backend shutting down")


app = FastAPI(
    title="BookStackHub API",
    version="0.1.0",
    docs_url="/api/v1/docs",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

# Custom exception handler — return {"error": {...}} without FastAPI's "detail" wrapper
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.error_message,
                "details": exc.error_details,
            }
        },
    )


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(books.router, prefix="/api/v1")
app.include_router(images.router, prefix="/api/v1")
app.include_router(user_books.router, prefix="/api/v1")
app.include_router(tags.router, prefix="/api/v1")
app.include_router(reading_logs.router, prefix="/api/v1")
app.include_router(reviews.me_router, prefix="/api/v1")
app.include_router(reviews.book_reviews_router, prefix="/api/v1")
app.include_router(playlists.me_router, prefix="/api/v1")
app.include_router(playlists.router, prefix="/api/v1")
app.include_router(playlists.share_router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(data.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
