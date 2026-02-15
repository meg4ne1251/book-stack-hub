import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.cleanup.cleanup_deactivated_users")
def cleanup_deactivated_users():
    """退会後30日経過したユーザーを物理削除"""
    logger.info("Running cleanup_deactivated_users task")
    # TODO: Implement in Phase H


@celery_app.task(name="app.tasks.cleanup.cleanup_expired_tokens")
def cleanup_expired_tokens():
    """期限切れのrefresh_tokens / password_reset_tokensを削除"""
    logger.info("Running cleanup_expired_tokens task")
    # TODO: Implement in Phase H
