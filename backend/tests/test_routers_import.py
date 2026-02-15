"""新規ルーターのインポートテスト"""

import pytest


def test_import_stats_router():
    from app.routers.stats import router
    assert router is not None
    assert router.prefix == "/me/stats"


def test_import_users_router():
    from app.routers.users import router
    assert router is not None
    assert router.prefix == "/users"


def test_import_admin_router():
    from app.routers.admin import router
    assert router is not None
    assert router.prefix == "/admin"


def test_import_data_router():
    from app.routers.data import router
    assert router is not None
    assert router.prefix == "/me"


def test_import_tasks_router():
    from app.routers.tasks import router
    assert router is not None
    assert router.prefix == "/tasks"


def test_all_routers_registered():
    """main.pyにすべてのルーターが登録されていることを確認"""
    from app.main import app

    routes = [route.path for route in app.routes]
    # Check key API prefixes
    prefixes = set()
    for route in app.routes:
        path = getattr(route, "path", "")
        if path.startswith("/api/v1"):
            parts = path.replace("/api/v1", "").split("/")
            if len(parts) > 1:
                prefixes.add(parts[1])

    assert "health" in prefixes
    assert "auth" in prefixes
    assert "books" in prefixes
    assert "me" in prefixes
    assert "admin" in prefixes
    assert "users" in prefixes
    assert "tasks" in prefixes


def test_data_tasks_import():
    """Celeryタスクのインポートテスト"""
    from app.tasks.data import process_import, process_export
    assert process_import is not None
    assert process_export is not None
