"""
対象カテゴリの記事数をカウント
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

ZENDESK_SUBDOMAIN = os.getenv("ZENDESK_SUBDOMAIN")
ZENDESK_EMAIL = os.getenv("ZENDESK_EMAIL")
ZENDESK_API_TOKEN = os.getenv("ZENDESK_API_TOKEN")

BASE_URL = f"https://{ZENDESK_SUBDOMAIN}/api/v2/help_center"
AUTH = (f"{ZENDESK_EMAIL}/token", ZENDESK_API_TOKEN)

# 対象カテゴリ
TARGET_CATEGORIES = {
    4408155186841: "男性会員の方",
    4408155187865: "女性会員の方",
    52609440775449: "法人の方",
}


def count_articles_in_category(category_id: int) -> int:
    """カテゴリ内の記事数を取得（per_page=1でcountのみ確認）"""
    url = f"{BASE_URL}/categories/{category_id}/articles.json"
    response = requests.get(url, auth=AUTH, params={"per_page": 1})
    response.raise_for_status()
    return response.json().get("count", 0)


def main():
    print("=== 対象カテゴリの記事数 ===\n")

    total = 0
    for cat_id, cat_name in TARGET_CATEGORIES.items():
        count = count_articles_in_category(cat_id)
        print(f"{cat_name}: {count}件")
        total += count

    print(f"\n合計: {total}件")


if __name__ == "__main__":
    main()
