"""
対象カテゴリの記事を全件取得してJSONで保存
読み取り専用（GETリクエストのみ）

オプション:
  --incremental: 前回取得以降に更新された記事のみを取得（差分更新）
"""

import os
import json
import re
import shutil
import argparse
from html import unescape
from datetime import datetime
from pathlib import Path
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

OUTPUT_DIR = Path("data/articles")
OUTPUT_FILE = OUTPUT_DIR / "all_articles.json"


def safe_save_json(data: list, path: Path) -> None:
    """アトミック書き込み + バックアップで安全に保存"""
    backup_path = path.with_suffix(".json.bak")
    temp_path = path.with_suffix(".json.tmp")

    # 1. 一時ファイルに書き込み
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 2. 既存ファイルをバックアップ
    if path.exists():
        shutil.copy2(path, backup_path)

    # 3. 一時ファイルをリネーム（アトミック操作）
    temp_path.rename(path)


def load_existing_articles() -> tuple[list, str | None]:
    """既存の記事データを読み込み、最新のupdated_atを取得"""
    if not OUTPUT_FILE.exists():
        return [], None

    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        articles = json.load(f)

    if not articles:
        return [], None

    # 最新のupdated_atを取得
    latest_updated = max(
        article.get("updated_at", "")
        for article in articles
    )

    return articles, latest_updated


def merge_articles(existing: list, new_articles: list) -> list:
    """既存の記事と新しい記事をマージ（重複はIDで判別し新しい方を採用）

    Note: 非公開(draft)記事は新規・更新どちらも除外済みの前提
    """
    articles_by_id = {article["id"]: article for article in existing}

    for article in new_articles:
        # 非公開記事の場合は既存からも削除（公開→非公開に変更された場合）
        if article.get("draft", False):
            articles_by_id.pop(article["id"], None)
        else:
            articles_by_id[article["id"]] = article

    # 最終的に非公開記事を除外
    return [a for a in articles_by_id.values() if not a.get("draft", False)]


def strip_html(html: str) -> str:
    """HTMLタグを除去してプレーンテキストに変換"""
    if not html:
        return ""
    # HTMLタグを除去
    text = re.sub(r'<[^>]+>', ' ', html)
    # HTMLエンティティをデコード
    text = unescape(text)
    # 連続する空白を1つに
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def fetch_all_articles_in_category(category_id: int, updated_since: str | None = None) -> list:
    """カテゴリ内の全記事を取得（ページネーション対応）

    Args:
        category_id: カテゴリID
        updated_since: この日時以降に更新された記事のみ取得（ISO 8601形式）
    """
    articles = []
    url = f"{BASE_URL}/categories/{category_id}/articles.json"
    params = {"per_page": 100}

    # 差分取得: start_timeパラメータを使用
    if updated_since:
        # Zendesk APIはstart_timeにUnixタイムスタンプを要求
        dt = datetime.fromisoformat(updated_since.replace("Z", "+00:00"))
        params["start_time"] = int(dt.timestamp())

    while url:
        response = requests.get(url, auth=AUTH, params=params)
        response.raise_for_status()
        data = response.json()

        articles.extend(data.get("articles", []))

        # 次ページがあれば続行
        url = data.get("next_page")
        params = {}  # next_pageにはパラメータが含まれている

    return articles


def transform_article(article: dict, category_name: str) -> dict:
    """記事データをRAG用の形式に変換"""
    return {
        "id": str(article["id"]),
        "title": article["title"],
        "body_html": article["body"],
        "body_text": strip_html(article["body"]),
        "url": article["html_url"],
        "category": category_name,
        "section_id": str(article["section_id"]),
        "updated_at": article["updated_at"],
        "created_at": article["created_at"],
        "draft": article.get("draft", False),
    }


def main(incremental: bool = False):
    print("=== 記事エクスポート ===\n")
    print(f"出力先: {OUTPUT_DIR.absolute()}")

    # 出力ディレクトリ作成
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 差分取得モードの場合、既存データを読み込み
    existing_articles = []
    updated_since = None

    if incremental:
        existing_articles, updated_since = load_existing_articles()
        if updated_since:
            print(f"モード: 差分取得（{updated_since} 以降）")
            print(f"既存記事数: {len(existing_articles)}件\n")
        else:
            print("モード: 全件取得（既存データなし）\n")
            incremental = False
    else:
        print("モード: 全件取得\n")

    new_articles = []

    for cat_id, cat_name in TARGET_CATEGORIES.items():
        print(f"取得中: {cat_name} (ID: {cat_id})")
        articles = fetch_all_articles_in_category(cat_id, updated_since)
        print(f"  → {len(articles)}件取得")

        # 公開記事のみをフィルタリング（draft=Falseのもの）
        published_articles = [a for a in articles if not a.get("draft", False)]
        draft_count = len(articles) - len(published_articles)
        if draft_count > 0:
            print(f"  → {draft_count}件の非公開記事を除外")

        for article in published_articles:
            transformed = transform_article(article, cat_name)
            new_articles.append(transformed)

    print(f"\n新規/更新: {len(new_articles)}件")

    # マージまたは置換
    if incremental and existing_articles:
        all_articles = merge_articles(existing_articles, new_articles)
        print(f"マージ後の合計: {len(all_articles)}件")
    else:
        all_articles = new_articles
        print(f"合計: {len(all_articles)}件")

    # 全記事を1ファイルにまとめて保存（アトミック書き込み + バックアップ）
    safe_save_json(all_articles, OUTPUT_FILE)
    print(f"\n保存完了: {OUTPUT_FILE}")

    # サンプル表示（最初の1件）
    if new_articles:
        print("\n--- サンプル（最新1件） ---")
        sample = new_articles[0]
        print(f"ID: {sample['id']}")
        print(f"タイトル: {sample['title']}")
        print(f"カテゴリ: {sample['category']}")
        print(f"URL: {sample['url']}")
        print(f"本文（先頭200文字）: {sample['body_text'][:200]}...")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Zendesk記事をエクスポート")
    parser.add_argument(
        "--incremental", "-i",
        action="store_true",
        help="差分取得モード（前回以降に更新された記事のみ取得）"
    )
    args = parser.parse_args()

    main(incremental=args.incremental)
