import os
from fastapi import Header, HTTPException


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
