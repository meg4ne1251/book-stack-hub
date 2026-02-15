import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.books.refresh_stale_books")
def refresh_stale_books():
    """半年以上未更新のマスター書籍を外部APIで再取得"""
    logger.info("Running refresh_stale_books task")
    # TODO: Implement in Phase H
