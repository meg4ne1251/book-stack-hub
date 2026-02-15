from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "bookstackhub",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_BROKER_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Tokyo",
    enable_utc=True,
    task_acks_late=True,
    task_default_retry_delay=8,
    task_max_retries=3,
    task_soft_time_limit=540,
    task_time_limit=600,
    worker_concurrency=2,
)

# Celery Beat schedule
celery_app.conf.beat_schedule = {
    # 退会ユーザー物理削除バッチ（毎日AM 4:00 JST）
    "cleanup-deactivated-users": {
        "task": "app.tasks.cleanup.cleanup_deactivated_users",
        "schedule": crontab(hour=4, minute=0),
    },
    # 期限切れトークン削除バッチ（毎日AM 4:30 JST）
    "cleanup-expired-tokens": {
        "task": "app.tasks.cleanup.cleanup_expired_tokens",
        "schedule": crontab(hour=4, minute=30),
    },
    # マスター書籍定期更新（毎月15日AM 3:00 JST）
    "refresh-stale-books": {
        "task": "app.tasks.books.refresh_stale_books",
        "schedule": crontab(hour=3, minute=0, day_of_month=15),
    },
    # 年間レポート自動生成（12月31日AM 0:00 JST）
    "generate-yearly-reports": {
        "task": "app.tasks.reports.generate_yearly_reports",
        "schedule": crontab(hour=0, minute=0, month_of_year=12, day_of_month=31),
    },
}

# Auto-discover tasks in app.tasks package
celery_app.autodiscover_tasks(["app.tasks"])
