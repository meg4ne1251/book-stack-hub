"""レートリミットのテスト（Luaスクリプト方式）"""
from unittest.mock import AsyncMock, patch

import pytest

from app.utils.rate_limit import check_rate_limit


@pytest.mark.asyncio
class TestCheckRateLimit:
    """スライディングウィンドウレートリミット（redis.eval Luaスクリプト）"""

    @patch("app.utils.rate_limit.redis_client")
    async def test_allows_within_limit(self, mock_redis):
        """制限内のリクエストは許可（Luaスクリプトが1を返す）"""
        mock_redis.eval = AsyncMock(return_value=1)
        result = await check_rate_limit("test_key", max_requests=10, window_seconds=60)
        assert result is True
        mock_redis.eval.assert_called_once()

    @patch("app.utils.rate_limit.redis_client")
    async def test_blocks_over_limit(self, mock_redis):
        """制限超過のリクエストはブロック（Luaスクリプトが0を返す）"""
        mock_redis.eval = AsyncMock(return_value=0)
        result = await check_rate_limit("test_key", max_requests=10, window_seconds=60)
        assert result is False

    @patch("app.utils.rate_limit.redis_client")
    async def test_passes_correct_arguments(self, mock_redis):
        """正しい引数がLuaスクリプトに渡される"""
        mock_redis.eval = AsyncMock(return_value=1)
        await check_rate_limit("rate:login:127.0.0.1", max_requests=10, window_seconds=60)

        args = mock_redis.eval.call_args
        # eval(script, num_keys, key, now, window_start, max_requests, window_seconds)
        assert args[0][1] == 1  # num_keys
        assert args[0][2] == "rate:login:127.0.0.1"  # key
        assert args[0][5] == "10"  # max_requests
        assert args[0][6] == "60"  # window_seconds
