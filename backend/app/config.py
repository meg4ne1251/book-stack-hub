import logging
import sys

from pydantic_settings import BaseSettings

_INSECURE_DEFAULT_KEY = "changeme_secret_key_at_least_32_bytes"

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://bookstackhub:password@db:5432/bookstackhub"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    SECRET_KEY: str = _INSECURE_DEFAULT_KEY
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # External APIs
    GOOGLE_BOOKS_API_KEY: str = ""
    RAKUTEN_APP_ID: str = ""
    RAKUTEN_AFFILIATE_ID: str = ""

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost"

    # Image
    IMAGE_CACHE_DIR: str = "/data/images"
    AVATAR_CACHE_DIR: str = "/data/avatars"
    IMAGE_MAX_WIDTH: int = 400
    IMAGE_QUALITY: int = 80

    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/1"

    # Admin
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    # AWS SES
    AWS_SES_REGION: str = "ap-northeast-1"
    AWS_SES_ACCESS_KEY_ID: str = ""
    AWS_SES_SECRET_ACCESS_KEY: str = ""
    AWS_SES_FROM_EMAIL: str = "noreply@bookstackhub.example.com"

    # Cloudflare Turnstile
    TURNSTILE_SITE_KEY: str = ""
    TURNSTILE_SECRET_KEY: str = ""

    # Development
    DEV_MODE: bool = False

    # Font
    FONT_DIR: str = "/app/fonts"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

# Fail-fast: 本番環境でデフォルトのシークレットキーを使用させない
if not settings.DEV_MODE and settings.SECRET_KEY == _INSECURE_DEFAULT_KEY:
    logger.critical(
        "SECRET_KEY is set to the insecure default value. "
        "Set a strong SECRET_KEY via environment variable or .env file."
    )
    sys.exit(1)
