"""
Admin API endpoints - ログ履歴の取得など
"""

from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query

from ..config import get_settings, Settings
from ..middleware.auth import get_current_user, get_chat_logger_dep
from ..models.schemas import AdminLoginLogRequest
from ..services.chat_logger import ChatLogger
from ..services.data_status import DataStatusService

router = APIRouter(prefix="/api/admin", tags=["admin"])


async def get_logs_from_athena(
    chat_logger: ChatLogger,
    days: int,
    hours: Optional[int],
    log_type: Optional[str],
    limit: int,
    current_user: str,
) -> dict:
    """Athenaからログを取得（自分のログまたはユーザー情報なしのみ）"""
    try:
        logs = await chat_logger.query_logs(
            days=days,
            hours=hours,
            log_type=log_type,
            limit=limit,
        )

        # レスポンス形式を整形（自分のログまたはユーザー情報なしのみ）
        formatted_logs = []
        for log in logs:
            log_username = log.get('username')
            # 自分のログまたはユーザー情報がないもののみ
            if log_username is None or log_username == '' or log_username == current_user:
                formatted_logs.append({
                    'endpoint': log.get('endpoint', ''),
                    'timestamp': log.get('timestamp', ''),
                    'category': log.get('category'),
                    'username': log_username,
                    'query': log.get('query', ''),
                    'type': log.get('log_type', 'unknown'),
                    'answer': log.get('answer'),
                    'duration_ms': log.get('duration_ms'),
                    'sources_count': log.get('sources_count'),
                    'session_id': log.get('session_id'),
                    'message_id': log.get('message_id'),
                    'admin_user_id': log.get('admin_user_id'),
                    'admin_username': log.get('admin_username'),
                })

        return {
            'logs': formatted_logs,
            'count': len(formatted_logs),
            'days': days,
            'source': 'athena',
        }
    except Exception as e:
        raise Exception(f'Athenaクエリに失敗しました: {str(e)}')


@router.get("/logs")
async def get_user_input_logs(
    current_user: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    chat_logger: ChatLogger = Depends(get_chat_logger_dep),
    days: int = Query(default=7, ge=1, le=30, description="取得する日数（1-30）"),
    hours: Optional[int] = Query(default=None, ge=1, le=24, description="取得する時間数（1-24、daysより優先）"),
    log_type: Optional[Literal["faq", "internal"]] = Query(default=None, description="フィルタするタイプ（faq, internal）"),
    limit: int = Query(default=100, ge=1, le=500, description="取得件数上限"),
):
    """ユーザー入力履歴を取得（S3/Athena）"""
    try:
        # S3が設定されていればAthenaを使用
        if settings.chat_logs_bucket:
            return await get_logs_from_athena(chat_logger, days, hours, log_type, limit, current_user)
        else:
            # S3未設定時は空のレスポンス
            return {
                'logs': [],
                'count': 0,
                'days': days,
                'source': 'none',
                'message': 'S3バケットが設定されていません。ローカル環境ではコンソールログを確認してください。',
            }

    except Exception as e:
        return {
            'error': f'ログ取得に失敗しました: {str(e)}',
            'logs': [],
            'count': 0,
        }


@router.post("/logs/repair-partitions")
async def repair_partitions(
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    chat_logger: ChatLogger = Depends(get_chat_logger_dep),
):
    """Athenaパーティションを修復（新しいパーティションを検出）"""
    if not settings.chat_logs_bucket:
        return {
            'error': 'S3 bucket is not configured',
            'success': False,
        }

    try:
        await chat_logger.repair_partitions()
        return {
            'success': True,
            'message': 'Partitions repaired successfully',
        }
    except Exception as e:
        return {
            'error': f'パーティション修復に失敗しました: {str(e)}',
            'success': False,
        }


@router.get("/login-logs")
async def get_login_logs(
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    chat_logger: ChatLogger = Depends(get_chat_logger_dep),
    days: int = Query(default=7, ge=1, le=30, description="取得する日数（1-30）"),
    limit: int = Query(default=100, ge=1, le=500, description="取得件数上限"),
):
    """ログイン履歴を取得"""
    if not settings.chat_logs_bucket:
        return {
            'logs': [],
            'count': 0,
            'days': days,
            'message': 'S3バケットが設定されていません。',
        }

    try:
        logs = await chat_logger.query_login_logs(days=days, limit=limit)
        return {
            'logs': logs,
            'count': len(logs),
            'days': days,
        }
    except Exception as e:
        return {
            'error': f'ログイン履歴の取得に失敗しました: {str(e)}',
            'logs': [],
            'count': 0,
        }


@router.get("/data-status")
async def get_data_status(
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """データの読み込み状況を取得"""
    service = DataStatusService(settings)
    return service.get_data_status()


@router.post("/log-event")
async def log_admin_event(
    request: AdminLoginLogRequest,
    current_user: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    chat_logger: ChatLogger = Depends(get_chat_logger_dep),
):
    """管理者ログインイベントを記録"""
    if not settings.chat_logs_bucket:
        return {
            'success': True,
            'message': 'S3バケットが設定されていないため、ログは記録されませんでした。',
        }

    try:
        await chat_logger.log_login(
            username=current_user,
            endpoint='/api/admin/login',
            admin_user_id=request.admin_user_id,
            admin_username=request.admin_username,
        )
        return {
            'success': True,
            'message': 'ログイン記録が保存されました。',
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'ログイン記録に失敗しました: {str(e)}',
        }
