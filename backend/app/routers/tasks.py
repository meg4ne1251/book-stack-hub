"""タスク進捗 API"""

from fastapi import APIRouter
from celery.result import AsyncResult

from app.dependencies import CurrentUser
from app.tasks.celery_app import celery_app

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/{task_id}/status")
async def get_task_status(
    task_id: str,
    current_user: CurrentUser,
):
    """非同期タスクの進捗確認"""
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
