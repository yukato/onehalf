"""
Zendesk API 接続確認のみ（最小テスト）
カテゴリを1件だけ取得して接続を確認する
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

ZENDESK_SUBDOMAIN = os.getenv("ZENDESK_SUBDOMAIN")
ZENDESK_EMAIL = os.getenv("ZENDESK_EMAIL")
ZENDESK_API_TOKEN = os.getenv("ZENDESK_API_TOKEN")


def main():
    print("=== Zendesk API 接続テスト ===\n")

    # 設定確認
    print(f"Subdomain: {ZENDESK_SUBDOMAIN}")
    print(f"Email: {ZENDESK_EMAIL}")
    print(f"API Token: {'設定済み' if ZENDESK_API_TOKEN else '未設定'}\n")

    if not all([ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN]):
        print("[ERROR] 環境変数が不足しています")
        return

    # GET /api/v2/help_center/ja/categories.json?per_page=1
    url = f"https://{ZENDESK_SUBDOMAIN}/api/v2/help_center/ja/categories.json"
    auth = (f"{ZENDESK_EMAIL}/token", ZENDESK_API_TOKEN)

    print(f"リクエスト: GET {url}")
    print("パラメータ: per_page=1\n")

    try:
        response = requests.get(url, auth=auth, params={"per_page": 1})
        print(f"ステータスコード: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            categories = data.get("categories", [])
            if categories:
                print(f"\n[SUCCESS] 接続成功!")
                print(f"カテゴリ名: {categories[0].get('name', 'N/A')}")
            else:
                print("\n[SUCCESS] 接続成功（カテゴリは0件）")
        else:
            print(f"\n[ERROR] {response.status_code}: {response.text[:200]}")

    except requests.exceptions.RequestException as e:
        print(f"\n[ERROR] 接続失敗: {e}")


if __name__ == "__main__":
    main()
