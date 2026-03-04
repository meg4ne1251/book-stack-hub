import time

from app.utils.redis import redis_client


async def check_rate_limit(
    key: str, max_requests: int, window_seconds: int
) -> bool:
    """
    Redisベースのスライディングウィンドウレートリミット。
    Returns True if request is allowed, False if rate limited.
    """
    now = time.time()
    pipe = redis_client.pipeline()

    # Remove expired entries
    pipe.zremrangebyscore(key, 0, now - window_seconds)
    # Add current request
    pipe.zadd(key, {str(now): now})
    # Count requests in window
    pipe.zcard(key)
    # Set expiry on the key
    pipe.expire(key, window_seconds)

    results = await pipe.execute()
    request_count = results[2]

    return request_count < max_requests
