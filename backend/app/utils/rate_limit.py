import time

from app.utils.redis import redis_client

# Luaスクリプト: スライディングウィンドウ方式の原子的レートリミット
# KEYS[1] = rate limit key
# ARGV[1] = now (timestamp)
# ARGV[2] = window start (now - window_seconds)
# ARGV[3] = max_requests
# ARGV[4] = window_seconds (for expire)
# Returns: 1 if allowed, 0 if rate limited
_RATE_LIMIT_SCRIPT = """
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[2])
local count = redis.call('ZCARD', KEYS[1])
if count < tonumber(ARGV[3]) then
    redis.call('ZADD', KEYS[1], ARGV[1], ARGV[1])
    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[4]))
    return 1
end
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[4]))
return 0
"""


async def check_rate_limit(
    key: str, max_requests: int, window_seconds: int
) -> bool:
    """
    Redisベースのスライディングウィンドウレートリミット（原子的操作）。
    Returns True if request is allowed, False if rate limited.
    """
    now = time.time()
    result = await redis_client.eval(
        _RATE_LIMIT_SCRIPT,
        1,
        key,
        str(now),
        str(now - window_seconds),
        str(max_requests),
        str(window_seconds),
    )
    return result == 1
