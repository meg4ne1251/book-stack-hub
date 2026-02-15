"""画像配信API - 署名付きURL検証 + X-Accel-Redirect"""
import logging
from pathlib import Path

from fastapi import APIRouter, Query
from fastapi.responses import FileResponse, Response

from app.config import settings
from app.services.image_service import verify_signed_url
from app.utils.exceptions import ForbiddenException, NotFoundException

logger = logging.getLogger(__name__)
router = APIRouter(tags=["images"])


@router.get("/images/{filename}")
async def serve_image(
    filename: str,
    token: str = Query(...),
    expires: int = Query(...),
):
    """署名付きURLで表紙画像を配信"""
    if not verify_signed_url(filename, token, expires):
        raise ForbiddenException("Invalid or expired image token")

    if settings.DEV_MODE:
        # 開発環境: FastAPIから直接配信
        filepath = Path(settings.IMAGE_CACHE_DIR) / filename
        if not filepath.exists():
            raise NotFoundException("Image not found")
        return FileResponse(str(filepath), media_type="image/webp")

    # 本番環境: Nginx X-Accel-Redirect
    response = Response(status_code=200)
    response.headers["X-Accel-Redirect"] = f"/protected_images/{filename}"
    response.headers["Content-Type"] = "image/webp"
    return response


@router.get("/avatars/{filename}")
async def serve_avatar(
    filename: str,
    token: str = Query(...),
    expires: int = Query(...),
):
    """署名付きURLでアバター画像を配信"""
    if not verify_signed_url(filename, token, expires):
        raise ForbiddenException("Invalid or expired image token")

    if settings.DEV_MODE:
        filepath = Path(settings.AVATAR_CACHE_DIR) / filename
        if not filepath.exists():
            raise NotFoundException("Avatar not found")
        return FileResponse(str(filepath), media_type="image/webp")

    response = Response(status_code=200)
    response.headers["X-Accel-Redirect"] = f"/protected_avatars/{filename}"
    response.headers["Content-Type"] = "image/webp"
    return response
