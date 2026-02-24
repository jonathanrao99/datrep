import os
import time
from collections import defaultdict, deque

from fastapi import Header, HTTPException, Request


# Simple in-memory rate limiter (per IP).
# Good baseline for single-instance deployments.
_RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


async def require_api_token(authorization: str | None = Header(default=None)) -> None:
    """Optional bearer token auth for API routes.

    If API_AUTH_TOKEN is unset, auth is disabled.
    If set, callers must send: Authorization: Bearer <token>
    """
    expected = os.getenv("API_AUTH_TOKEN")
    if not expected:
        return

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    if token != expected:
        raise HTTPException(status_code=401, detail="Invalid bearer token")


async def require_rate_limit(request: Request) -> None:
    """Basic fixed-window-ish sliding limiter using timestamp deque.

    Controlled by RATE_LIMIT_PER_MINUTE (default: 30).
    """
    limit = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))
    if limit <= 0:
        return

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - 60

    bucket = _RATE_BUCKETS[client_ip]
    while bucket and bucket[0] < window_start:
        bucket.popleft()

    if len(bucket) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again shortly.")

    bucket.append(now)
