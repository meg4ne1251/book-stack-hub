"""レートリミットのテスト"""
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.utils.rate_limit import check_rate_limit


class MockPipeline:
    """Redis pipeline mock (synchronous method calls, async execute)"""

    def __init__(self, count: int):
        self._count = count

    def zremrangebyscore(self, key, min_val, max_val):
        pass

    def zadd(self, key, mapping):
        pass

    def zcard(self, key):
        pass

    def expire(self, key, seconds):
        pass

    async def execute(self):
        return [None, None, self._count, None]


@pytest.mark.asyncio
class TestCheckRateLimit:
    """スライディングウィンドウレートリミット"""

    @patch("app.utils.rate_limit.redis_client")
    async def test_allows_within_limit(self, mock_redis):
        """制限内のリクエストは許可"""
        mock_redis.pipeline = MagicMock(return_value=MockPipeline(count=5))
        result = await check_rate_limit("test_key", max_requests=10, window_seconds=60)
        assert result is True

    @patch("app.utils.rate_limit.redis_client")
    async def test_blocks_over_limit(self, mock_redis):
        """制限超過のリクエストはブロック"""
        mock_redis.pipeline = MagicMock(return_value=MockPipeline(count=11))
        result = await check_rate_limit("test_key", max_requests=10, window_seconds=60)
        assert result is False

    @patch("app.utils.rate_limit.redis_client")
    async def test_exactly_at_limit(self, mock_redis):
        """ちょうど制限数のリクエストは許可"""
        mock_redis.pipeline = MagicMock(return_value=MockPipeline(count=10))
        result = await check_rate_limit("test_key", max_requests=10, window_seconds=60)
        assert result is True

    @patch("app.utils.rate_limit.redis_client")
    async def test_first_request(self, mock_redis):
        """最初のリクエストは許可"""
        mock_redis.pipeline = MagicMock(return_value=MockPipeline(count=1))
        result = await check_rate_limit("test_key", max_requests=10, window_seconds=60)
        assert result is True
