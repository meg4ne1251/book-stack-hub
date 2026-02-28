"""書籍表紙画像のキャッシュ・変換・署名付きURL生成"""
import hashlib
import hmac
import io
import logging
import time
import uuid
from pathlib import Path
from urllib.parse import urlparse

import httpx
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

# 画像ダウンロード許可ドメイン（SSRF対策）
ALLOWED_IMAGE_DOMAINS = {
    "books.google.com",
    "thumbnail.image.rakuten.co.jp",
}

SIGNATURE_EXPIRE_SECONDS = 24 * 60 * 60  # 24時間

# 画像マジックバイト（ファイルヘッダ）検証
IMAGE_MAGIC_BYTES = {
    b'\xff\xd8\xff': 'image/jpeg',
    b'\x89PNG\r\n\x1a\n': 'image/png',
    b'RIFF': 'image/webp',  # WebPはRIFF...WEBP形式
}


def validate_image_magic_bytes(data: bytes) -> bool:
    """マジックバイト検証: JPEG/PNG/WebPのファイルヘッダを確認"""
    if len(data) < 12:
        return False
    for magic, _ in IMAGE_MAGIC_BYTES.items():
        if data[:len(magic)] == magic:
            # WebPは追加検証: RIFF....WEBP
            if magic == b'RIFF':
                return data[8:12] == b'WEBP'
            return True
    return False


def _is_allowed_domain(url: str) -> bool:
    """SSRF対策: 許可ドメインのみダウンロード可能"""
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    return any(
        hostname == domain or hostname.endswith(f".{domain}")
        for domain in ALLOWED_IMAGE_DOMAINS
    )


async def download_and_convert_cover(
    url: str, book_id: str | None = None
) -> str | None:
    """
    外部URLから表紙画像をダウンロードし、WebPに変換して保存。
    Returns: 保存されたファイル名（相対パス）
    """
    if not _is_allowed_domain(url):
        logger.warning("Image download blocked (SSRF): %s", url)
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            image_data = response.content
    except httpx.HTTPError as e:
        logger.error("Failed to download cover image: %s", e)
        return None

    return convert_and_save_image(image_data, book_id)


def convert_and_save_image(
    image_data: bytes, book_id: str | None = None
) -> str | None:
    """画像データをWebPに変換してローカルに保存"""
    try:
        image = Image.open(io.BytesIO(image_data))

        # リサイズ（アスペクト比維持、最大幅制限）
        max_width = settings.IMAGE_MAX_WIDTH
        if image.width > max_width:
            ratio = max_width / image.width
            new_height = int(image.height * ratio)
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)

        # RGBAをRGBに変換（WebP保存用）
        if image.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")

        # ファイル名生成（UUIDベース）
        filename = f"{book_id or uuid.uuid4()}.webp"
        filepath = Path(settings.IMAGE_CACHE_DIR) / filename
        filepath.parent.mkdir(parents=True, exist_ok=True)

        # WebP形式で保存（再エンコードにより悪意あるペイロードを除去）
        image.save(str(filepath), "WEBP", quality=settings.IMAGE_QUALITY)

        return filename
    except Exception as e:
        logger.error("Failed to convert cover image: %s", e)
        return None


def generate_signed_url(filename: str) -> str:
    """HMAC-SHA256署名付きURLを生成"""
    expires = int(time.time()) + SIGNATURE_EXPIRE_SECONDS
    signature_string = f"{filename}:{expires}"
    token = hmac.new(
        settings.SECRET_KEY.encode(),
        signature_string.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"/api/v1/images/{filename}?token={token}&expires={expires}"


def verify_signed_url(filename: str, token: str, expires: int) -> bool:
    """署名付きURLを検証"""
    if time.time() > expires:
        return False

    signature_string = f"{filename}:{expires}"
    expected_token = hmac.new(
        settings.SECRET_KEY.encode(),
        signature_string.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(token, expected_token)


def convert_and_save_avatar(
    image_data: bytes, user_id: str
) -> str | None:
    """アバター画像を200x200にリサイズしてWebP保存"""
    try:
        image = Image.open(io.BytesIO(image_data))

        # 正方形にクロップ
        min_dim = min(image.width, image.height)
        left = (image.width - min_dim) // 2
        top = (image.height - min_dim) // 2
        image = image.crop((left, top, left + min_dim, top + min_dim))

        # 200x200にリサイズ
        image = image.resize((200, 200), Image.Resampling.LANCZOS)

        if image.mode != "RGB":
            image = image.convert("RGB")

        filename = f"{user_id}.webp"
        filepath = Path(settings.AVATAR_CACHE_DIR) / filename
        filepath.parent.mkdir(parents=True, exist_ok=True)

        image.save(str(filepath), "WEBP", quality=settings.IMAGE_QUALITY)
        return filename
    except Exception as e:
        logger.error("Failed to convert avatar image: %s", e)
        return None
