"""データインポート・エクスポート API"""

from fastapi import APIRouter, UploadFile, File

from app.dependencies import CurrentUser, DBSession
from app.utils.exceptions import ValidationException

router = APIRouter(prefix="/me", tags=["data"])


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
    body: dict,
    current_user: CurrentUser,
    db: DBSession,
):
    """データエクスポートリクエスト（Celeryタスク）"""
    format_type = body.get("format", "csv")
    if format_type not in ("csv", "json"):
        raise ValidationException("Unsupported format. Use 'csv' or 'json'.")

    include_images = body.get("include_images", False)

    from app.tasks.data import process_export

    task = process_export.delay(
        str(current_user.id),
        format_type,
        include_images,
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
    from app.tasks.data import process_export
    from celery.result import AsyncResult

    result = AsyncResult(task_id)

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
        from fastapi.responses import FileResponse

        return FileResponse(
            file_path,
            media_type="application/octet-stream",
            filename=file_path.split("/")[-1],
        )
    else:
        return {"status": "failed", "progress": 0, "total": 0, "errors": [str(result.result)]}
