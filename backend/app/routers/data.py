"""
Data browsing API endpoints - データの一覧表示・検索
"""

import json
from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..config import get_settings, Settings
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/api/data", tags=["data"])


def load_json_file(path: str) -> list:
    """Load JSON file and return list"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


@router.get("/articles")
async def get_articles(
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    q: Optional[str] = Query(default=None, description="検索クエリ（タイトル）"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """FAQ記事の一覧・検索"""
    path = f"{settings.data_base_path}/articles/all_articles.json"
    articles = load_json_file(path)

    # Filter by search query
    if q:
        q_lower = q.lower()
        articles = [
            a for a in articles
            if q_lower in a.get("title", "").lower()
        ]

    # Sort by updated_at desc
    articles.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

    total = len(articles)
    items = articles[offset:offset + limit]

    return {
        "items": [
            {
                "id": a.get("id"),
                "title": a.get("title", ""),
                "url": a.get("url", ""),
                "updated_at": a.get("updated_at"),
                "category": a.get("category"),
            }
            for a in items
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/tickets")
async def get_tickets(
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    q: Optional[str] = Query(default=None, description="検索クエリ（件名またはチケットID）"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Zendeskチケットの一覧・検索"""
    path = f"{settings.data_base_path}/tickets/solved_tickets.json"
    tickets = load_json_file(path)

    # Filter by search query
    if q:
        q_lower = q.lower()
        tickets = [
            t for t in tickets
            if q_lower in t.get("subject", "").lower()
            or q_lower in str(t.get("ticket_id", ""))
        ]

    # Sort by updated_at desc
    tickets.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

    total = len(tickets)
    items = tickets[offset:offset + limit]

    return {
        "items": [
            {
                "id": t.get("ticket_id"),
                "subject": t.get("subject", ""),
                "url": t.get("url", ""),
                "updated_at": t.get("updated_at"),
                "status": t.get("status"),
            }
            for t in items
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_macro_admin_url(macro_id: int, api_url: str = "") -> str:
    """Convert macro API URL to admin URL"""
    # Extract subdomain from API URL if available
    # Default to helpcenter.bachelorapp.net
    subdomain = "helpcenter.bachelorapp.net"
    if api_url and "://" in api_url:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(api_url)
            subdomain = parsed.netloc
        except Exception:
            pass
    return f"https://{subdomain}/admin/workspaces/agent-workspace/macros/{macro_id}"


@router.get("/macros")
async def get_macros(
    _: str = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    q: Optional[str] = Query(default=None, description="検索クエリ（タイトル）"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Zendeskマクロの一覧・検索

    Returns:
        items: マクロ一覧
            - is_faq_enabled: FAQチャットボットで使用可（【チャットボット使用可】タグ付き）
            - is_internal_enabled: 内部サポートで使用可（常にtrue）
    """
    # 内部サポート用マクロファイル（全マクロ + is_faq_enabled フラグ付き）
    path = settings.get_internal_macros_path()
    macros = load_json_file(path)

    # Filter by search query
    if q:
        q_lower = q.lower()
        macros = [
            m for m in macros
            if q_lower in m.get("title", "").lower()
            or q_lower in str(m.get("macro_id", ""))
        ]

    # Sort by macro_id desc (newer macros typically have higher IDs)
    macros.sort(key=lambda x: x.get("macro_id", 0), reverse=True)

    total = len(macros)
    items = macros[offset:offset + limit]

    return {
        "items": [
            {
                "id": m.get("macro_id"),
                "title": m.get("title", ""),
                "url": get_macro_admin_url(m.get("macro_id", 0), m.get("url", "")),
                "updated_at": m.get("updated_at"),
                "is_faq_enabled": m.get("is_faq_enabled", False),
                "is_internal_enabled": True,  # 内部サポートは全マクロ対象
            }
            for m in items
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }
