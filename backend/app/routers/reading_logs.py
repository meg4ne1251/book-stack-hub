"""読書ログAPI"""
import logging
import uuid
from datetime import date

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.dependencies import CurrentUser, DBSession
from app.models.reading_log import ReadingLog
from app.utils.exceptions import NotFoundException, ValidationException
from app.utils.redis import redis_client
from app.utils.response import paginated_response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/me/reading-logs", tags=["reading-logs"])


class ReadingLogCreate(BaseModel):
    book_id: str
    read_date: str
    pages_read: int | None = Field(default=None, ge=1, le=99999)
    minutes_read: int | None = Field(default=None, ge=1, le=1440)
    note: str | None = Field(default=None, max_length=500)


class ReadingLogUpdate(BaseModel):
    read_date: str | None = None
    pages_read: int | None = Field(default=None, ge=1, le=99999)
    minutes_read: int | None = Field(default=None, ge=1, le=1440)
    note: str | None = Field(default=None, max_length=500)


async def _invalidate_heatmap_cache(user_id: uuid.UUID) -> None:
    """ヒートマップキャッシュを無効化（Redis障害時はログのみ）"""
    try:
        pattern = f"heatmap:{user_id}:*"
        async for key in redis_client.scan_iter(pattern):
            await redis_client.delete(key)
    except Exception as e:
        logger.warning("Failed to invalidate heatmap cache for user %s: %s", user_id, e)


@router.get("")
async def list_reading_logs(
    current_user: CurrentUser,
    db: DBSession,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
):
    """読書ログ一覧"""
    count_q = select(func.count(ReadingLog.id)).where(
        ReadingLog.user_id == current_user.id
    )
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    offset = (page - 1) * per_page
    result = await db.execute(
        select(ReadingLog)
        .where(ReadingLog.user_id == current_user.id)
        .order_by(ReadingLog.read_date.desc(), ReadingLog.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    logs = result.scalars().all()

    data = [
        {
            "id": str(log.id),
            "book_id": str(log.book_id),
            "read_date": str(log.read_date),
            "pages_read": log.pages_read,
            "minutes_read": log.minutes_read,
            "note": log.note,
            "created_at": str(log.created_at),
        }
        for log in logs
    ]
    return paginated_response(data, page, per_page, total)


@router.post("")
async def create_reading_log(
    body: ReadingLogCreate,
    current_user: CurrentUser,
    db: DBSession,
):
    """読書ログ記録"""
    try:
        book_uuid = uuid.UUID(body.book_id)
    except ValueError:
        raise ValidationException("Invalid book_id format")

    try:
        read_date = date.fromisoformat(body.read_date)
    except ValueError:
        raise ValidationException("Invalid date format. Use YYYY-MM-DD.")

    log = ReadingLog(
        user_id=current_user.id,
        book_id=book_uuid,
        read_date=read_date,
        pages_read=body.pages_read,
        minutes_read=body.minutes_read,
        note=body.note,
    )
    db.add(log)
    await db.flush()
    await _invalidate_heatmap_cache(current_user.id)

    return {
        "data": {
            "id": str(log.id),
            "book_id": str(log.book_id),
            "read_date": str(log.read_date),
            "pages_read": log.pages_read,
            "minutes_read": log.minutes_read,
            "note": log.note,
            "created_at": str(log.created_at),
        }
    }


@router.get("/heatmap")
async def get_heatmap(
    current_user: CurrentUser,
    db: DBSession,
    year: int = Query(...),
):
    """ヒートマップデータ取得（Redisキャッシュ付き）"""
    import json

    cache_key = f"heatmap:{current_user.id}:{year}"

    # Check cache
    cached = await redis_client.get(cache_key)
    if cached:
        return {"data": json.loads(cached)}

    # Query from DB
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)

    result = await db.execute(
        select(
            ReadingLog.read_date,
            func.count(ReadingLog.id).label("count"),
            func.coalesce(func.sum(ReadingLog.pages_read), 0).label("total_pages"),
        )
        .where(
            ReadingLog.user_id == current_user.id,
            ReadingLog.read_date >= start_date,
            ReadingLog.read_date <= end_date,
        )
        .group_by(ReadingLog.read_date)
    )

    heatmap_data = {}
    for row in result:
        heatmap_data[str(row.read_date)] = {
            "count": row.count,
            "total_pages": row.total_pages,
        }

    # Cache for 1 hour
    await redis_client.set(cache_key, json.dumps(heatmap_data), ex=3600)

    return {"data": heatmap_data}


@router.patch("/{log_id}")
async def update_reading_log(
    log_id: uuid.UUID,
    body: ReadingLogUpdate,
    current_user: CurrentUser,
    db: DBSession,
):
    """読書ログ編集"""
    result = await db.execute(
        select(ReadingLog).where(
            ReadingLog.id == log_id,
            ReadingLog.user_id == current_user.id,
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        raise NotFoundException("Reading log not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "read_date" and value:
            try:
                value = date.fromisoformat(value)
            except ValueError:
                raise ValidationException("Invalid date format. Use YYYY-MM-DD.")
        setattr(log, key, value)

    await _invalidate_heatmap_cache(current_user.id)

    return {
        "data": {
            "id": str(log.id),
            "book_id": str(log.book_id),
            "read_date": str(log.read_date),
            "pages_read": log.pages_read,
            "minutes_read": log.minutes_read,
            "note": log.note,
            "created_at": str(log.created_at),
        }
    }


@router.delete("/{log_id}", status_code=204)
async def delete_reading_log(
    log_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """読書ログ削除"""
    result = await db.execute(
        select(ReadingLog).where(
            ReadingLog.id == log_id,
            ReadingLog.user_id == current_user.id,
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        raise NotFoundException("Reading log not found")

    await db.delete(log)
    await _invalidate_heatmap_cache(current_user.id)
