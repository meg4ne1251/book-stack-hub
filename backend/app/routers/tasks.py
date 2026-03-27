"""タスク進捗 API"""

import logging

from celery.result import AsyncResult
from fastapi import APIRouter

from app.dependencies import CurrentUser
from app.tasks.celery_app import celery_app
from app.utils.exceptions import ForbiddenException
from app.utils.redis import redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["tasks"])

# タスクIDとユーザーIDの紐付けキー（TTL: 24h）
_TASK_OWNER_PREFIX = "task_owner:"
TASK_OWNER_TTL = 86400


async def register_task_owner(task_id: str, user_id: str) -> None:
    """タスクの所有者をRedisに記録"""
    await redis_client.set(
        f"{_TASK_OWNER_PREFIX}{task_id}", user_id, ex=TASK_OWNER_TTL
    )


@router.get("/{task_id}/status")
async def get_task_status(
    task_id: str,
    current_user: CurrentUser,
):
    """非同期タスクの進捗確認（自分のタスクのみ）"""
    # タスク所有者の検証
    owner_id = await redis_client.get(f"{_TASK_OWNER_PREFIX}{task_id}")
    if owner_id and owner_id != str(current_user.id):
        raise ForbiddenException("Not authorized to view this task")

    result = AsyncResult(task_id, app=celery_app)

    if result.state == "PENDING":
        return {"status": "pending", "progress": 0, "total": 0, "errors": []}
    elif result.state == "PROCESSING":
        info = result.info or {}
        return {
            "status": "processing",
            "progress": info.get("progress", 0),
            "total": info.get("total", 0),
            "errors": info.get("errors", []),
        }
    elif result.state == "SUCCESS":
        return {
            "status": "completed",
            "progress": 100,
            "total": 100,
            "errors": [],
        }
    elif result.state == "FAILURE":
        return {
            "status": "failed",
            "progress": 0,
            "total": 0,
            "errors": [str(result.result)],
        }
    else:
        return {"status": result.state.lower(), "progress": 0, "total": 0, "errors": []}
