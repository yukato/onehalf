"""
Authentication API endpoints
"""

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request

from ..config import get_settings, Settings
from ..models.schemas import LoginRequest, TokenResponse
from ..services.auth_service import AuthService
from ..services.chat_logger import ChatLogger, LoginLog, get_chat_logger
from ..middleware.auth import get_auth_service, get_refresh_token_from_cookie


router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_chat_logger_dep(settings: Settings = Depends(get_settings)) -> ChatLogger:
    return get_chat_logger(settings)


def get_client_info(request: Request) -> tuple[str, str]:
    """リクエストからクライアント情報を取得"""
    # X-Forwarded-Forヘッダーがあればそれを使用（プロキシ/ロードバランサー経由の場合）
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    else:
        ip_address = request.client.host if request.client else "unknown"

    user_agent = request.headers.get("User-Agent", "unknown")
    return ip_address, user_agent


@router.post("/login", response_model=TokenResponse)
async def login(
    login_request: LoginRequest,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
    chat_logger: ChatLogger = Depends(get_chat_logger_dep),
):
    """Login and receive access token + refresh token cookie"""
    ip_address, user_agent = get_client_info(request)
    timestamp = datetime.utcnow().isoformat()

    if not auth_service.verify_credentials(login_request.username, login_request.password):
        # ログイン失敗を記録
        log_data: LoginLog = {
            "event_id": str(uuid4()),
            "timestamp": timestamp,
            "event_type": "login_failed",
            "username": login_request.username,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "success": False,
        }
        await chat_logger.log_login(log_data)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token = auth_service.create_access_token(login_request.username)
    refresh_token = auth_service.create_refresh_token(login_request.username)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=auth_service.get_refresh_token_max_age(),
    )

    # ログイン成功を記録
    log_data: LoginLog = {
        "event_id": str(uuid4()),
        "timestamp": timestamp,
        "event_type": "login",
        "username": login_request.username,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "success": True,
    }
    await chat_logger.log_login(log_data)

    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
    chat_logger: ChatLogger = Depends(get_chat_logger_dep),
):
    """Refresh access token using refresh token cookie"""
    refresh_token = get_refresh_token_from_cookie(request)
    ip_address, user_agent = get_client_info(request)
    timestamp = datetime.utcnow().isoformat()

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )

    username = auth_service.verify_token(refresh_token, "refresh")
    if username is None:
        response.delete_cookie("refresh_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    access_token = auth_service.create_access_token(username)

    # リフレッシュを記録
    log_data: LoginLog = {
        "event_id": str(uuid4()),
        "timestamp": timestamp,
        "event_type": "refresh",
        "username": username,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "success": True,
    }
    await chat_logger.log_login(log_data)

    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    chat_logger: ChatLogger = Depends(get_chat_logger_dep),
):
    """Logout and clear refresh token cookie"""
    ip_address, user_agent = get_client_info(request)
    timestamp = datetime.utcnow().isoformat()

    response.delete_cookie("refresh_token")

    # ログアウトを記録
    log_data: LoginLog = {
        "event_id": str(uuid4()),
        "timestamp": timestamp,
        "event_type": "logout",
        "username": "unknown",  # ログアウト時はトークンからユーザー名を取得できない場合がある
        "ip_address": ip_address,
        "user_agent": user_agent,
        "success": True,
    }
    await chat_logger.log_login(log_data)

    return None
