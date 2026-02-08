"""
Internal Support Tool API endpoints
"""

import logging
import time
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, Request

from ..config import get_settings, Settings
from ..models.schemas import ChatRequest, InternalChatResponse, InternalStats
from ..services.ticket_rag import TicketRAGService
from ..services.chat_logger import ChatLog, ChatLogger
from ..services.settings_manager import get_settings_manager
from ..middleware.auth import get_current_user, get_chat_logger_dep

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/internal", tags=["internal"])


def get_ticket_rag_service(settings: Settings = Depends(get_settings)) -> TicketRAGService:
    return TicketRAGService(settings)


@router.post("/chat", response_model=InternalChatResponse)
async def chat(
    request: ChatRequest,
    http_request: Request,
    current_user: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    rag_service: TicketRAGService = Depends(get_ticket_rag_service),
    chat_logger: ChatLogger = Depends(get_chat_logger_dep),
):
    """Get response suggestions based on similar tickets"""
    start_time = time.time()
    session_id = str(uuid4())
    message_id = str(uuid4())
    timestamp = datetime.now(settings.tz).isoformat()

    # 管理者ユーザー情報をヘッダーから取得
    admin_user_id = http_request.headers.get("X-Admin-User-Id")
    admin_username = http_request.headers.get("X-Admin-Username")

    result = rag_service.chat(request.query, request.top_k)

    duration_ms = int((time.time() - start_time) * 1000)

    # ログ記録（非同期）
    log_data: ChatLog = {
        "session_id": session_id,
        "message_id": message_id,
        "timestamp": timestamp,
        "endpoint": "/api/internal/chat",
        "log_type": "internal",
        "category": None,
        "username": current_user,
        "query": request.query,
        "answer": result.answer,
        "duration_ms": duration_ms,
        "sources_count": len(result.sources),
    }

    # 管理者情報がある場合のみ追加
    if admin_user_id:
        log_data["admin_user_id"] = admin_user_id
    if admin_username:
        log_data["admin_username"] = admin_username

    await chat_logger.log(log_data)

    return result


@router.get("/stats", response_model=InternalStats)
async def stats(
    _: str = Depends(get_current_user),
    rag_service: TicketRAGService = Depends(get_ticket_rag_service),
):
    """Get internal tool statistics"""
    settings_manager = get_settings_manager()
    current_settings = settings_manager.get_settings()
    return InternalStats(
        ticket_count=rag_service.get_ticket_count(),
        model=current_settings.model,
    )
