import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.reports.generate_yearly_reports")
def generate_yearly_reports():
    """全ユーザーの年間読書レポートを自動生成"""
    logger.info("Running generate_yearly_reports task")
    # TODO: Implement in Phase G
