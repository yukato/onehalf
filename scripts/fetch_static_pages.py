"""
静的ページ（利用規約、プライバシーポリシーなど）をスクレイピングして
記事データに追加するスクリプト
"""

import json
import requests
from bs4 import BeautifulSoup
from pathlib import Path


# スクレイピング対象のページ
STATIC_PAGES = [
    {
        "url": "https://www.wi.bachelorapp.net/new-terms-of-service",
        "title": "利用規約",
        "category": "規約・ポリシー",
    },
    {
        "url": "https://www.wi.bachelorapp.net/information-security-policy",
        "title": "情報セキュリティ基本方針",
        "category": "規約・ポリシー",
    },
    {
        "url": "https://www.wi.bachelorapp.net/privacy",
        "title": "プライバシーポリシー",
        "category": "規約・ポリシー",
    },
    {
        "url": "https://www.wi.bachelorapp.net/dealing",
        "title": "特定商取引法に基づく表記",
        "category": "規約・ポリシー",
    },
]


def fetch_page_content(url: str) -> str:
    """WebページからメインコンテンツのテキストをT抽出"""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; BachelorBot/1.0; Support Chatbot)"
    }

    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")

    # 不要な要素を削除
    for tag in soup.find_all(["script", "style", "nav", "header", "footer", "noscript"]):
        tag.decompose()

    # メインコンテンツを探す（複数のパターンを試行）
    main_content = None
    for selector in ["main", "article", ".content", "#content", ".main-content", "body"]:
        main_content = soup.select_one(selector)
        if main_content:
            break

    if not main_content:
        main_content = soup.body

    # テキストを抽出（空白を整理）
    text = main_content.get_text(separator="\n", strip=True)

    # 連続する空行を1つに
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return "\n".join(lines)


def fetch_static_pages():
    """静的ページをスクレイピングして記事データに追加"""
    articles_path = Path("data/articles/all_articles.json")

    # 既存の記事データを読み込み
    print(f"既存の記事データを読み込み中: {articles_path}")
    with open(articles_path, "r", encoding="utf-8") as f:
        articles = json.load(f)

    original_count = len(articles)
    print(f"  -> 既存記事数: {original_count}")

    # 既存のURLセットを作成（重複防止）
    existing_urls = {a["url"] for a in articles}

    # 静的ページをスクレイピング
    added_count = 0
    for page in STATIC_PAGES:
        url = page["url"]

        if url in existing_urls:
            print(f"スキップ（既存）: {page['title']}")
            continue

        print(f"取得中: {page['title']} ({url})")
        try:
            body_text = fetch_page_content(url)

            # 記事として追加
            article = {
                "id": f"static_{len(articles) + 1}",
                "title": page["title"],
                "url": url,
                "body_text": body_text,
                "category": page["category"],
                "source": "static_page",
            }
            articles.append(article)
            added_count += 1
            print(f"  -> 追加完了 (文字数: {len(body_text)})")

        except Exception as e:
            print(f"  -> エラー: {e}")

    # 保存
    if added_count > 0:
        with open(articles_path, "w", encoding="utf-8") as f:
            json.dump(articles, f, ensure_ascii=False, indent=2)
        print(f"\n記事データを更新しました: {original_count} -> {len(articles)} 件")
        print("\n注意: Embeddingの再計算が必要です:")
        print("  python scripts/precompute_embeddings.py")
    else:
        print("\n新しい記事はありませんでした")


if __name__ == "__main__":
    fetch_static_pages()
