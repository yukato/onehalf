"""
記事エクスポートのテスト（1件のみ）
"""

import os
import json
import re
from html import unescape
import requests
from dotenv import load_dotenv

load_dotenv()

ZENDESK_SUBDOMAIN = os.getenv("ZENDESK_SUBDOMAIN")
ZENDESK_EMAIL = os.getenv("ZENDESK_EMAIL")
ZENDESK_API_TOKEN = os.getenv("ZENDESK_API_TOKEN")

BASE_URL = f"https://{ZENDESK_SUBDOMAIN}/api/v2/help_center"
AUTH = (f"{ZENDESK_EMAIL}/token", ZENDESK_API_TOKEN)

# テスト対象: 男性会員の方（1件だけ）
TEST_CATEGORY_ID = 4408155186841
TEST_CATEGORY_NAME = "男性会員の方"


def strip_html(html: str) -> str:
    """HTMLタグを除去してプレーンテキストに変換"""
    if not html:
        return ""
    text = re.sub(r'<[^>]+>', ' ', html)
    text = unescape(text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def main():
    print("=== 記事エクスポート テスト（1件のみ） ===\n")

    # 1件だけ取得
    url = f"{BASE_URL}/categories/{TEST_CATEGORY_ID}/articles.json"
    response = requests.get(url, auth=AUTH, params={"per_page": 1})
    response.raise_for_status()

    articles = response.json().get("articles", [])

    if not articles:
        print("記事が見つかりませんでした")
        return

    article = articles[0]

    # 変換
    transformed = {
        "id": str(article["id"]),
        "title": article["title"],
        "body_html": article["body"],
        "body_text": strip_html(article["body"]),
        "url": article["html_url"],
        "category": TEST_CATEGORY_NAME,
        "section_id": str(article["section_id"]),
        "updated_at": article["updated_at"],
        "created_at": article["created_at"],
    }

    print("--- 変換後のデータ ---")
    print(json.dumps(transformed, ensure_ascii=False, indent=2))

    print("\n--- body_text（全文） ---")
    print(transformed["body_text"])


if __name__ == "__main__":
    main()
