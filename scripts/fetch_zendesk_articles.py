"""
Zendesk Help Center API 疎通確認スクリプト
FAQ記事を取得して構造を確認する
"""

import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

ZENDESK_SUBDOMAIN = os.getenv("ZENDESK_SUBDOMAIN")
ZENDESK_EMAIL = os.getenv("ZENDESK_EMAIL")
ZENDESK_API_TOKEN = os.getenv("ZENDESK_API_TOKEN")

BASE_URL = f"https://{ZENDESK_SUBDOMAIN}/api/v2/help_center"


def get_auth():
    """Basic認証用のタプルを返す"""
    return (f"{ZENDESK_EMAIL}/token", ZENDESK_API_TOKEN)


def fetch_articles(locale: str = "ja", per_page: int = 10) -> dict:
    """記事一覧を取得"""
    url = f"{BASE_URL}/{locale}/articles.json"
    params = {"per_page": per_page, "sort_by": "updated_at", "sort_order": "desc"}

    response = requests.get(url, auth=get_auth(), params=params)
    response.raise_for_status()
    return response.json()


def fetch_categories(locale: str = "ja") -> dict:
    """カテゴリ一覧を取得"""
    url = f"{BASE_URL}/{locale}/categories.json"

    response = requests.get(url, auth=get_auth())
    response.raise_for_status()
    return response.json()


def fetch_sections(locale: str = "ja") -> dict:
    """セクション一覧を取得"""
    url = f"{BASE_URL}/{locale}/sections.json"

    response = requests.get(url, auth=get_auth())
    response.raise_for_status()
    return response.json()


def main():
    print("=" * 60)
    print("Zendesk Help Center API 疎通確認")
    print("=" * 60)

    # 設定確認
    print(f"\nSubdomain: {ZENDESK_SUBDOMAIN}")
    print(f"Email: {ZENDESK_EMAIL}")
    print(f"API Token: {'*' * 10}{'...' if ZENDESK_API_TOKEN else '未設定'}")

    if not all([ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN]):
        print("\n[ERROR] 環境変数が設定されていません。.envファイルを確認してください。")
        return

    # カテゴリ取得
    print("\n--- カテゴリ一覧 ---")
    try:
        categories = fetch_categories()
        for cat in categories.get("categories", []):
            print(f"  - [{cat['id']}] {cat['name']}")
    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] カテゴリ取得失敗: {e}")
        return

    # セクション取得
    print("\n--- セクション一覧 ---")
    try:
        sections = fetch_sections()
        for sec in sections.get("sections", []):
            print(f"  - [{sec['id']}] {sec['name']} (category: {sec['category_id']})")
    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] セクション取得失敗: {e}")

    # 記事取得
    print("\n--- 記事一覧 (最新10件) ---")
    try:
        articles = fetch_articles()
        for article in articles.get("articles", []):
            print(f"\n  [{article['id']}] {article['title']}")
            print(f"    URL: {article['html_url']}")
            print(f"    Section: {article['section_id']}")
            print(f"    Updated: {article['updated_at']}")
            print(f"    Body (先頭200文字): {article['body'][:200] if article['body'] else 'なし'}...")

        print(f"\n合計記事数: {articles.get('count', 'N/A')}")

        # 最初の記事の全体構造を出力
        if articles.get("articles"):
            print("\n--- 記事データ構造 (サンプル) ---")
            sample = articles["articles"][0]
            print(json.dumps({k: type(v).__name__ for k, v in sample.items()}, indent=2))

    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] 記事取得失敗: {e}")


if __name__ == "__main__":
    main()
