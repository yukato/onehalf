"""
Zendesk Support API 疎通確認スクリプト
チケット情報を取得できるかテストする
"""

import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

ZENDESK_SUBDOMAIN = os.getenv("ZENDESK_SUBDOMAIN")
ZENDESK_EMAIL = os.getenv("ZENDESK_EMAIL")
ZENDESK_API_TOKEN = os.getenv("ZENDESK_API_TOKEN")

BASE_URL = f"https://{ZENDESK_SUBDOMAIN}/api/v2"


def get_auth():
    """Basic認証用のタプルを返す"""
    return (f"{ZENDESK_EMAIL}/token", ZENDESK_API_TOKEN)


def fetch_tickets(per_page: int = 5) -> dict:
    """チケット一覧を取得（最新順）"""
    url = f"{BASE_URL}/tickets.json"
    params = {
        "per_page": per_page,
        "sort_by": "updated_at",
        "sort_order": "desc",
    }

    response = requests.get(url, auth=get_auth(), params=params)
    response.raise_for_status()
    return response.json()


def fetch_ticket_comments(ticket_id: int) -> dict:
    """チケットのコメント（やり取り）を取得"""
    url = f"{BASE_URL}/tickets/{ticket_id}/comments.json"

    response = requests.get(url, auth=get_auth())
    response.raise_for_status()
    return response.json()


def fetch_ticket_count() -> int:
    """チケット総数を取得"""
    url = f"{BASE_URL}/tickets/count.json"

    response = requests.get(url, auth=get_auth())
    response.raise_for_status()
    return response.json().get("count", {}).get("value", 0)


def main():
    print("=" * 60)
    print("Zendesk Support API 疎通確認（チケット）")
    print("=" * 60)

    # 設定確認
    print(f"\nSubdomain: {ZENDESK_SUBDOMAIN}")
    print(f"Email: {ZENDESK_EMAIL}")
    print(f"API Token: {'*' * 10}{'...' if ZENDESK_API_TOKEN else '未設定'}")

    if not all([ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN]):
        print("\n[ERROR] 環境変数が設定されていません。.envファイルを確認してください。")
        return

    # チケット総数を取得
    print("\n--- チケット総数 ---")
    try:
        count = fetch_ticket_count()
        print(f"  総チケット数: {count:,} 件")
    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] チケット数取得失敗: {e}")
        print(f"  ステータスコード: {e.response.status_code}")
        print(f"  レスポンス: {e.response.text[:500]}")
        return

    # チケット一覧を取得
    print("\n--- チケット一覧 (最新5件) ---")
    try:
        tickets_data = fetch_tickets(per_page=5)
        tickets = tickets_data.get("tickets", [])

        for ticket in tickets:
            print(f"\n  [#{ticket['id']}] {ticket['subject'] or '(件名なし)'}")
            print(f"    ステータス: {ticket['status']}")
            print(f"    優先度: {ticket['priority'] or 'なし'}")
            print(f"    作成日: {ticket['created_at']}")
            print(f"    更新日: {ticket['updated_at']}")
            print(f"    タグ: {', '.join(ticket['tags']) if ticket['tags'] else 'なし'}")

            # 説明文（最初の200文字）
            desc = ticket.get('description', '')
            if desc:
                print(f"    説明: {desc[:200]}...")

        # 最初のチケットのコメントを取得
        if tickets:
            first_ticket = tickets[0]
            print(f"\n--- チケット #{first_ticket['id']} のコメント ---")
            try:
                comments_data = fetch_ticket_comments(first_ticket['id'])
                comments = comments_data.get("comments", [])
                print(f"  コメント数: {len(comments)}")

                for i, comment in enumerate(comments[:3], 1):  # 最初の3件のみ
                    print(f"\n  [{i}] {comment['created_at']}")
                    print(f"      作成者ID: {comment['author_id']}")
                    print(f"      公開: {'はい' if comment['public'] else 'いいえ（内部メモ）'}")
                    body = comment.get('plain_body') or comment.get('body', '')
                    print(f"      本文: {body[:150]}...")

            except requests.exceptions.HTTPError as e:
                print(f"  [ERROR] コメント取得失敗: {e}")

        # チケットデータ構造を出力
        if tickets:
            print("\n--- チケットデータ構造 ---")
            sample = tickets[0]
            print(json.dumps({k: type(v).__name__ for k, v in sample.items()}, indent=2, ensure_ascii=False))

    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] チケット取得失敗: {e}")
        print(f"  ステータスコード: {e.response.status_code}")
        print(f"  レスポンス: {e.response.text[:500]}")


if __name__ == "__main__":
    main()
