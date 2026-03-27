import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.database import async_session_factory
from app.utils.redis import redis_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check() -> JSONResponse:
    """システムヘルスチェック（DB・Redis接続確認）"""
    status = "ok"

    # PostgreSQL check
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        logger.error("Database health check failed: %s", e)
        status = "degraded"

    # Redis check
    try:
        await redis_client.ping()
    except Exception as e:
        logger.error("Redis health check failed: %s", e)
        status = "degraded"

    # 外部公開用: 内部サービス状態の詳細は返さない
    status_code = 200 if status == "ok" else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": status},
    )
