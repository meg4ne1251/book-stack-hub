"""データインポート・エクスポート API"""

import os
from typing import Literal

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel

from app.dependencies import CurrentUser, DBSession
from app.utils.exceptions import ForbiddenException, NotFoundException, ValidationException

router = APIRouter(prefix="/me", tags=["data"])


class ExportRequest(BaseModel):
    format: Literal["csv", "json"] = "csv"
    include_images: bool = False


@router.post("/import")
async def import_data(
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(...),
):
    """データインポート開始（Celeryタスク）"""
    allowed_types = {
        "text/csv",
        "application/json",
        "application/vnd.ms-excel",
    }
    filename = file.filename or ""
    if not (
        file.content_type in allowed_types
        or filename.endswith(".csv")
        or filename.endswith(".json")
    ):
        raise ValidationException("Unsupported file format. Use CSV or JSON.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise ValidationException("File too large. Maximum 10MB.")

    # Queue import task
    from app.tasks.data import process_import

    task = process_import.delay(
        str(current_user.id),
        content.decode("utf-8"),
        filename,
    )

    return {
        "task_id": str(task.id),
        "message": "Import task queued",
    }


@router.post("/export")
async def export_data(
    body: ExportRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """データエクスポートリクエスト（Celeryタスク）"""
    from app.tasks.data import process_export

    task = process_export.delay(
        str(current_user.id),
        body.format,
        body.include_images,
    )

    return {
        "task_id": str(task.id),
        "message": "Export task queued",
    }


@router.get("/export/{task_id}/download")
async def download_export(
    task_id: str,
    current_user: CurrentUser,
):
    """エクスポートファイルダウンロード"""
    from celery.result import AsyncResult
    from app.tasks.celery_app import celery_app

    result = AsyncResult(task_id, app=celery_app)

    if result.state == "PENDING":
        return {"status": "pending", "progress": 0, "total": 0, "errors": []}
    elif result.state == "PROCESSING":
        info = result.info or {}
        return {
            "status": "processing",
            "progress": info.get("progress", 0),
            "total": info.get("total", 0),
            "errors": [],
        }
    elif result.state == "SUCCESS":
        file_path = result.result
        if not file_path or not os.path.isfile(file_path):
            raise NotFoundException("Export file not found")

        # セキュリティ: パストラバーサル防止
        # 1. パスを正規化してシンボリックリンク・相対パスを解決
        resolved_path = os.path.realpath(file_path)
        # 2. ファイル名がユーザーIDで始まることを検証
        base_name = os.path.basename(resolved_path)
        if not base_name.startswith(str(current_user.id)):
            raise ForbiddenException("Not authorized to download this export")

        from fastapi.responses import FileResponse

        return FileResponse(
            resolved_path,
            media_type="application/octet-stream",
            filename=base_name,
        )
    else:
        return {"status": "failed", "progress": 0, "total": 0, "errors": [str(result.result)]}
