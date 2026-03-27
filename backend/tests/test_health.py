import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint_returns_status(client: AsyncClient):
    """ヘルスチェックエンドポイントがステータスを返すこと"""
    response = await client.get("/api/v1/health")
    # DB/Redisが無い環境では503、接続可能なら200
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data
    assert data["status"] in ("ok", "degraded")
    # セキュリティ: 内部サービス名は公開しない
    assert "services" not in data
