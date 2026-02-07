"""
Zendesk マクロ取得スクリプト（読み取り専用）

安全対策:
- GETリクエストのみ使用（変更・削除は一切しない）
- 認証情報は環境変数から取得
- --dry-run オプションで接続確認のみ可能

使用方法:
    # 接続確認のみ（何も保存しない）
    python scripts/fetch_zendesk_macros.py --dry-run

    # マクロ一覧を取得してJSONで保存
    python scripts/fetch_zendesk_macros.py

    # CSVでも出力
    python scripts/fetch_zendesk_macros.py --csv

    # アクティブなマクロのみ取得
    python scripts/fetch_zendesk_macros.py --active-only
"""

import os
import sys
import json
import csv
import argparse
from datetime import datetime
from typing import Optional

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


def check_connection() -> bool:
    """API接続確認（読み取り専用）"""
    url = f"{BASE_URL}/users/me.json"
    try:
        response = requests.get(url, auth=get_auth(), timeout=10)
        response.raise_for_status()
        user = response.json().get("user", {})
        print(f"  接続成功: {user.get('name')} ({user.get('email')})")
        print(f"  ロール: {user.get('role')}")
        return True
    except requests.exceptions.HTTPError as e:
        print(f"  [ERROR] 接続失敗: {e}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"  [ERROR] ネットワークエラー: {e}")
        return False


def fetch_macros(active_only: bool = False) -> list:
    """
    マクロ一覧を取得（読み取り専用）

    Args:
        active_only: Trueの場合、アクティブなマクロのみ取得

    Returns:
        マクロのリスト
    """
    endpoint = "macros/active.json" if active_only else "macros.json"
    url = f"{BASE_URL}/{endpoint}"

    all_macros = []
    page = 1

    while url:
        print(f"  ページ {page} を取得中...")
        response = requests.get(url, auth=get_auth(), timeout=30)
        response.raise_for_status()

        data = response.json()
        macros = data.get("macros", [])
        all_macros.extend(macros)

        # 次のページがあれば続行
        url = data.get("next_page")
        page += 1

    return all_macros


def extract_macro_summary(macro: dict) -> dict:
    """マクロから重要な情報を抽出"""
    actions = macro.get("actions", [])

    # アクションの内容を整理
    action_summary = []
    comment_value = None

    for action in actions:
        field = action.get("field", "")
        value = action.get("value", "")

        if field == "comment_value":
            comment_value = value
        elif field == "comment_value_html":
            if not comment_value:  # comment_valueがない場合のみ
                comment_value = value
        else:
            action_summary.append(f"{field}: {value}")

    return {
        "id": macro.get("id"),
        "title": macro.get("title"),
        "active": macro.get("active"),
        "description": macro.get("description"),
        "created_at": macro.get("created_at"),
        "updated_at": macro.get("updated_at"),
        "usage_1h": macro.get("usage_1h", 0),
        "usage_24h": macro.get("usage_24h", 0),
        "usage_7d": macro.get("usage_7d", 0),
        "usage_30d": macro.get("usage_30d", 0),
        "comment_template": comment_value,
        "other_actions": "; ".join(action_summary) if action_summary else None,
    }


def save_json(macros: list, output_path: str):
    """JSON形式で保存"""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(macros, f, ensure_ascii=False, indent=2)
    print(f"  JSON保存完了: {output_path}")


def save_csv(macros: list, output_path: str):
    """CSV形式で保存（サマリー）"""
    summaries = [extract_macro_summary(m) for m in macros]

    if not summaries:
        print("  [WARN] 保存するマクロがありません")
        return

    fieldnames = summaries[0].keys()

    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(summaries)

    print(f"  CSV保存完了: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Zendesk マクロ取得スクリプト（読み取り専用）"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="接続確認のみ（データ取得・保存しない）",
    )
    parser.add_argument(
        "--active-only",
        action="store_true",
        help="アクティブなマクロのみ取得",
    )
    parser.add_argument(
        "--csv",
        action="store_true",
        help="CSV形式でも出力",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/zendesk_macros",
        help="出力ディレクトリ（デフォルト: data/zendesk_macros）",
    )

    args = parser.parse_args()

    print("=" * 60)
    print("Zendesk マクロ取得スクリプト（読み取り専用）")
    print("=" * 60)

    # 設定確認
    print(f"\n[設定]")
    print(f"  Subdomain: {ZENDESK_SUBDOMAIN}")
    print(f"  Email: {ZENDESK_EMAIL}")
    print(f"  API Token: {'*' * 10}..." if ZENDESK_API_TOKEN else "  API Token: 未設定")

    if not all([ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN]):
        print("\n[ERROR] 環境変数が設定されていません。.envファイルを確認してください。")
        print("必要な環境変数:")
        print("  - ZENDESK_SUBDOMAIN")
        print("  - ZENDESK_EMAIL")
        print("  - ZENDESK_API_TOKEN")
        sys.exit(1)

    # 接続確認
    print(f"\n[接続確認]")
    if not check_connection():
        sys.exit(1)

    # ドライランの場合はここで終了
    if args.dry_run:
        print("\n[ドライラン完了] 接続確認のみ実行しました。")
        print("実際にマクロを取得するには --dry-run を外して実行してください。")
        sys.exit(0)

    # マクロ取得
    print(f"\n[マクロ取得]")
    mode = "アクティブのみ" if args.active_only else "全て"
    print(f"  モード: {mode}")

    try:
        macros = fetch_macros(active_only=args.active_only)
        print(f"  取得完了: {len(macros)} 件")
    except requests.exceptions.HTTPError as e:
        print(f"  [ERROR] マクロ取得失敗: {e}")
        sys.exit(1)

    if not macros:
        print("  マクロが見つかりませんでした。")
        sys.exit(0)

    # 出力ディレクトリ作成
    os.makedirs(args.output_dir, exist_ok=True)

    # タイムスタンプ
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # JSON保存
    print(f"\n[保存]")
    json_path = os.path.join(args.output_dir, f"macros_{timestamp}.json")
    save_json(macros, json_path)

    # CSV保存（オプション）
    if args.csv:
        csv_path = os.path.join(args.output_dir, f"macros_{timestamp}.csv")
        save_csv(macros, csv_path)

    # サマリー表示
    print(f"\n[サマリー]")
    active_count = sum(1 for m in macros if m.get("active"))
    inactive_count = len(macros) - active_count
    print(f"  アクティブ: {active_count} 件")
    print(f"  非アクティブ: {inactive_count} 件")

    # 上位5件を表示
    print(f"\n[マクロ一覧（先頭5件）]")
    for macro in macros[:5]:
        status = "✓" if macro.get("active") else "✗"
        print(f"  [{status}] {macro.get('title')} (ID: {macro.get('id')})")

    if len(macros) > 5:
        print(f"  ... 他 {len(macros) - 5} 件")

    print(f"\n完了！")


if __name__ == "__main__":
    main()
