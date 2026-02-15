import logging

from fastapi import APIRouter
from sqlalchemy import text

from app.database import async_session_factory
from app.utils.redis import redis_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """システムヘルスチェック（DB・Redis接続確認）"""
    result: dict = {"status": "ok", "services": {}}

    # PostgreSQL check
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        result["services"]["database"] = "ok"
    except Exception as e:
        logger.error("Database health check failed: %s", e)
        result["services"]["database"] = "error"
        result["status"] = "degraded"

    # Redis check
    try:
        await redis_client.ping()
        result["services"]["redis"] = "ok"
    except Exception as e:
        logger.error("Redis health check failed: %s", e)
        result["services"]["redis"] = "error"
        result["status"] = "degraded"

    return result
