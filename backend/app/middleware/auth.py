"""
Authentication middleware and dependencies
"""

import base64
import secrets
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..config import get_settings, Settings
from ..services.auth_service import AuthService
from ..services.chat_logger import ChatLogger, get_chat_logger


security = HTTPBearer(auto_error=False)


def get_auth_service(settings: Settings = Depends(get_settings)) -> AuthService:
    return AuthService(settings)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_service: AuthService = Depends(get_auth_service),
    settings: Settings = Depends(get_settings),
) -> str:
    """Dependency to get the current authenticated user.

    Supports both:
    1. Bearer JWT token (Authorization header)
    2. Basic Auth (X-Basic-Auth or Authorization header)
    """
    # 1. Check Basic Auth first (X-Basic-Auth or Authorization: Basic)
    basic_auth_header = request.headers.get("X-Basic-Auth") or (
        request.headers.get("Authorization")
        if request.headers.get("Authorization", "").startswith("Basic ")
        else None
    )

    if basic_auth_header and basic_auth_header.startswith("Basic "):
        try:
            decoded = base64.b64decode(basic_auth_header[6:]).decode("utf-8")
            username, password = decoded.split(":", 1)
            if secrets.compare_digest(username, settings.basic_auth_user) and \
               secrets.compare_digest(password, settings.basic_auth_password):
                return username  # Basic Auth成功
        except Exception:
            pass

    # 2. Check Bearer JWT token
    if credentials:
        token = credentials.credentials
        username = auth_service.verify_token(token, "access")
        if username:
            return username

    # Both methods failed
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_refresh_token_from_cookie(request: Request) -> Optional[str]:
    """Extract refresh token from cookie"""
    return request.cookies.get("refresh_token")


def get_chat_logger_dep(settings: Settings = Depends(get_settings)) -> ChatLogger:
    """Common dependency for chat logger"""
    return get_chat_logger(settings)
