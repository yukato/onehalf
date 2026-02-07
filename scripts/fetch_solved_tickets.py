"""
解決済みチケットを取得してRAGデータとして保存するスクリプト
- 全コメント（内部メモ含む）を取得
- 個人情報をマスク処理
- publicフラグを保持して後で使い分け可能に

オプション:
  --months: 取得する月数（デフォルト: 6ヶ月）
  --incremental, -i: 差分取得モード（前回取得以降に更新されたチケットのみ取得）
"""

import os
import re
import json
import time
import shutil
import logging
import requests
from pathlib import Path
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv

load_dotenv()

# ログ設定
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"fetch_tickets_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

ZENDESK_SUBDOMAIN = os.getenv("ZENDESK_SUBDOMAIN")
ZENDESK_EMAIL = os.getenv("ZENDESK_EMAIL")
ZENDESK_API_TOKEN = os.getenv("ZENDESK_API_TOKEN")

BASE_URL = f"https://{ZENDESK_SUBDOMAIN}/api/v2"
OUTPUT_DIR = Path("data/tickets")
OUTPUT_FILE = OUTPUT_DIR / "solved_tickets.json"


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


def load_existing_tickets() -> tuple[list, str | None]:
    """既存のチケットデータを読み込み、最新のupdated_atを取得"""
    if not OUTPUT_FILE.exists():
        return [], None

    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        tickets = json.load(f)

    if not tickets:
        return [], None

    # 最新のupdated_atを取得
    latest_updated = max(
        ticket.get("updated_at", "")
        for ticket in tickets
    )

    return tickets, latest_updated


def merge_tickets(existing: list, new_tickets: list) -> list:
    """既存のチケットと新しいチケットをマージ（重複はIDで判別し新しい方を採用）"""
    tickets_by_id = {ticket["ticket_id"]: ticket for ticket in existing}

    for ticket in new_tickets:
        tickets_by_id[ticket["ticket_id"]] = ticket

    # updated_atで降順ソート
    merged = sorted(
        tickets_by_id.values(),
        key=lambda t: t.get("updated_at", ""),
        reverse=True
    )

    return merged


def get_auth():
    return (f"{ZENDESK_EMAIL}/token", ZENDESK_API_TOKEN)


def mask_personal_info(text: str) -> str:
    """個人情報をマスク処理"""
    if not text:
        return text

    # メールアドレス
    text = re.sub(
        r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        '[EMAIL]',
        text
    )

    # 電話番号（日本形式）
    text = re.sub(
        r'(\d{2,4}[-\s]?\d{2,4}[-\s]?\d{3,4})',
        '[PHONE]',
        text
    )

    # 名前（〇〇 様 パターン）- 日本語名
    text = re.sub(
        r'([一-龯ぁ-んァ-ヶ]{1,10})\s*(様|さま|さん)',
        '[NAME] \\2',
        text
    )

    # 名前（英語名 様 パターン）
    text = re.sub(
        r'([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+)\s*(様|さま|さん)',
        '[NAME] \\2',
        text
    )

    # クレジットカード番号（16桁）
    text = re.sub(
        r'\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}',
        '[CARD_NUMBER]',
        text
    )

    return text


def fetch_tickets_by_query(query: str, label: str = "") -> list:
    """指定クエリでチケットを取得

    Zendesk Search APIは1,000件の上限があるため、
    期間を区切って取得する必要がある
    """
    tickets = []
    url = f"{BASE_URL}/search.json"

    if label:
        logger.info(f"  [{label}] クエリ: {query}")

    page = 1
    max_pages = 10  # 1,000件上限対策

    while page <= max_pages:
        params = {
            "query": query,
            "sort_by": "updated_at",
            "sort_order": "desc",
            "per_page": 100,
            "page": page,
        }

        logger.debug(f"API呼び出し: GET {url} (page={page})")
        response = requests.get(url, auth=get_auth(), params=params)

        if response.status_code == 422:
            logger.warning(f"  -> 1,000件上限に達しました（page={page}）")
            break

        response.raise_for_status()
        data = response.json()

        results = data.get("results", [])
        if not results:
            break

        tickets.extend(results)
        logger.debug(f"  -> ページ{page}: {len(results)}件取得 (累計: {len(tickets)}件)")

        if len(results) < 100:
            break

        page += 1
        time.sleep(0.5)  # レート制限対策

    if label:
        logger.info(f"  [{label}] {len(tickets)}件取得")

    return tickets


def fetch_tickets_for_period(start_date: str, end_date: str) -> list:
    """指定期間のチケットを取得（solved + closed）"""
    logger.info(f"期間 {start_date} 〜 {end_date} のチケットを取得中...")

    # Zendeskは括弧付きOR構文に非対応のため、別々に取得
    solved_query = f"type:ticket status:solved updated>={start_date} updated<{end_date}"
    closed_query = f"type:ticket status:closed updated>={start_date} updated<{end_date}"

    solved_tickets = fetch_tickets_by_query(solved_query, "solved")
    closed_tickets = fetch_tickets_by_query(closed_query, "closed")

    return solved_tickets + closed_tickets


def fetch_tickets_since(updated_since: str) -> list:
    """指定日時以降に更新されたチケットを取得（差分取得用）

    1,000件制限を回避するため、日ごとに分割して取得します。
    これにより、1週間以上更新を忘れても安全に差分取得できます。

    Args:
        updated_since: この日時以降に更新されたチケットのみ取得（ISO 8601形式）

    Returns:
        チケットのリスト
    """
    all_tickets = []
    seen_ids = set()

    # 開始日と終了日を計算
    start_date = datetime.fromisoformat(updated_since.replace("Z", "+00:00")).replace(tzinfo=None)
    end_date = datetime.now()
    days = (end_date - start_date).days + 1

    logger.info(f"差分取得: {start_date.strftime('%Y-%m-%d')} 以降に更新されたチケットを取得中...")
    logger.info(f"期間: {days}日間")
    logger.info("=" * 50)

    # 日ごとに分割して取得（1,000件制限を回避）
    current_date = start_date
    while current_date < end_date:
        next_date = min(current_date + timedelta(days=1), end_date)

        start_str = current_date.strftime("%Y-%m-%d")
        end_str = next_date.strftime("%Y-%m-%d")

        logger.info(f"期間 {start_str} 〜 {end_str} のチケットを取得中...")

        # Zendeskは括弧付きOR構文に非対応のため、別々に取得
        solved_query = f"type:ticket status:solved updated>={start_str} updated<{end_str}"
        closed_query = f"type:ticket status:closed updated>={start_str} updated<{end_str}"

        solved_tickets = fetch_tickets_by_query(solved_query, "solved")
        closed_tickets = fetch_tickets_by_query(closed_query, "closed")

        new_count = 0
        for ticket in solved_tickets + closed_tickets:
            ticket_id = ticket["id"]
            if ticket_id not in seen_ids:
                seen_ids.add(ticket_id)
                all_tickets.append(ticket)
                new_count += 1

        logger.info(f"  -> 新規: {new_count}件 (総計: {len(all_tickets)}件)")
        logger.info("")

        current_date = next_date

    logger.info("=" * 50)
    logger.info(f"差分取得完了: {len(all_tickets)} 件")

    return all_tickets


def fetch_solved_tickets(months: int = 6) -> list:
    """解決済みチケットを取得（週ごとに分割して1,000件制限を回避）

    Args:
        months: 取得する月数（デフォルト: 6ヶ月）

    Returns:
        チケットのリスト
    """
    all_tickets = []
    seen_ids = set()  # 重複排除用

    now = datetime.now()
    start_boundary = now - relativedelta(months=months)
    weeks = (now - start_boundary).days // 7 + 1

    logger.info(f"解決済みチケットを取得中... (過去{months}ヶ月分 = 約{weeks}週)")
    logger.info("=" * 50)

    # 週ごとに分割して取得
    for i in range(weeks):
        # 期間の計算（今週から遡る）
        end_date = now - timedelta(weeks=i)
        start_date = now - timedelta(weeks=i + 1)

        # 開始境界を超えないようにする
        if start_date < start_boundary:
            start_date = start_boundary

        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")

        tickets = fetch_tickets_for_period(start_str, end_str)

        # 重複排除
        new_tickets = []
        for ticket in tickets:
            ticket_id = ticket["id"]
            if ticket_id not in seen_ids:
                seen_ids.add(ticket_id)
                new_tickets.append(ticket)

        all_tickets.extend(new_tickets)
        logger.info(f"  -> 新規: {len(new_tickets)}件 (総計: {len(all_tickets)}件)")
        logger.info("")

    logger.info("=" * 50)
    logger.info(f"取得完了: 合計 {len(all_tickets)} 件")

    return all_tickets


def fetch_ticket_comments(ticket_id: int) -> list:
    """チケットのコメントを取得"""
    url = f"{BASE_URL}/tickets/{ticket_id}/comments.json"
    logger.debug(f"API呼び出し: GET {url}")
    response = requests.get(url, auth=get_auth())
    response.raise_for_status()
    comments = response.json().get("comments", [])
    logger.debug(f"  -> {len(comments)}件のコメント取得")
    return comments


def fetch_users(user_ids: list) -> dict:
    """ユーザー情報を一括取得（顧客/スタッフ判別用）"""
    if not user_ids:
        return {}

    # 重複を除去
    unique_ids = list(set(user_ids))
    logger.info(f"ユーザー情報を取得中... ({len(unique_ids)}件)")

    # 100件ずつ取得（API制限）
    users = {}
    for i in range(0, len(unique_ids), 100):
        batch_ids = unique_ids[i:i+100]
        url = f"{BASE_URL}/users/show_many.json"
        params = {"ids": ",".join(map(str, batch_ids))}

        logger.info(f"API呼び出し: GET {url} ({len(batch_ids)}件)")
        response = requests.get(url, auth=get_auth(), params=params)
        logger.info(f"  -> ステータス: {response.status_code}")
        response.raise_for_status()

        for user in response.json().get("users", []):
            users[user["id"]] = {
                "role": user.get("role"),  # "end-user", "agent", "admin"
                "is_staff": user.get("role") in ["agent", "admin"],
            }

        time.sleep(0.3)

    return users


def process_tickets(tickets: list) -> list:
    """チケットデータを処理してRAG用に整形"""
    processed = []

    # 全チケットのコメントからユーザーIDを収集
    logger.info("コメントを取得中...")
    all_user_ids = set()
    ticket_comments = {}

    for i, ticket in enumerate(tickets):
        ticket_id = ticket["id"]
        comments = fetch_ticket_comments(ticket_id)
        ticket_comments[ticket_id] = comments

        for comment in comments:
            all_user_ids.add(comment["author_id"])

        if (i + 1) % 10 == 0:
            logger.info(f"  {i + 1}/{len(tickets)} 件処理済み")
        time.sleep(0.3)  # レート制限対策

    # ユーザー情報を取得
    users = fetch_users(list(all_user_ids))

    # チケットデータを整形
    logger.info("データを整形中...")
    for ticket in tickets:
        ticket_id = ticket["id"]
        comments = ticket_comments.get(ticket_id, [])

        processed_comments = []
        for comment in comments:
            author_id = comment["author_id"]
            user_info = users.get(author_id, {})

            body = comment.get("plain_body") or comment.get("body", "")
            body = mask_personal_info(body)

            processed_comments.append({
                "body": body,
                "public": comment.get("public", True),
                "is_staff": user_info.get("is_staff", False),
                "created_at": comment.get("created_at"),
            })

        processed.append({
            "ticket_id": ticket_id,
            "subject": mask_personal_info(ticket.get("subject", "")),
            "description": mask_personal_info(ticket.get("description", "")),
            "status": ticket.get("status"),
            "tags": ticket.get("tags", []),
            "created_at": ticket.get("created_at"),
            "updated_at": ticket.get("updated_at"),
            "url": f"https://{ZENDESK_SUBDOMAIN}/agent/tickets/{ticket_id}",
            "comments": processed_comments,
        })

    return processed


def main(months: int = 6, incremental: bool = False):
    """メイン処理

    Args:
        months: 取得する月数（全件取得モード時）
        incremental: 差分取得モード
    """
    logger.info("=" * 60)
    logger.info("解決済みチケット取得スクリプト")
    logger.info("=" * 60)
    logger.info(f"ログファイル: {LOG_FILE}")

    # 出力ディレクトリ作成
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 差分取得モードの処理
    existing_tickets = []
    updated_since = None

    if incremental:
        existing_tickets, updated_since = load_existing_tickets()
        if updated_since:
            logger.info(f"モード: 差分取得（{updated_since} 以降）")
            logger.info(f"既存チケット数: {len(existing_tickets)}件")
        else:
            logger.info("モード: 全件取得（既存データなし）")
            incremental = False
    else:
        logger.info(f"モード: 全件取得（過去{months}ヶ月）")

    # チケット取得
    if incremental and updated_since:
        tickets = fetch_tickets_since(updated_since)
    else:
        tickets = fetch_solved_tickets(months=months)

    logger.info(f"取得したチケット数: {len(tickets)}")

    if not tickets and not existing_tickets:
        logger.warning("チケットが取得できませんでした")
        return

    # データ処理（新規取得分のみ）
    if tickets:
        processed = process_tickets(tickets)
    else:
        processed = []
        logger.info("新規/更新チケットはありません")

    # マージまたは置換
    if incremental and existing_tickets:
        final_tickets = merge_tickets(existing_tickets, processed)
        logger.info(f"マージ後のチケット数: {len(final_tickets)}件")
    else:
        final_tickets = processed

    # 保存（アトミック書き込み + バックアップ）
    safe_save_json(final_tickets, OUTPUT_FILE)

    logger.info(f"保存完了: {OUTPUT_FILE}")
    logger.info(f"チケット数: {len(final_tickets)}")

    # 統計
    total_comments = sum(len(t["comments"]) for t in final_tickets)
    public_comments = sum(
        sum(1 for c in t["comments"] if c["public"])
        for t in final_tickets
    )
    logger.info(f"総コメント数: {total_comments}")
    logger.info(f"  - 公開: {public_comments}")
    logger.info(f"  - 内部メモ: {total_comments - public_comments}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="解決済みチケットを取得してRAGデータとして保存")
    parser.add_argument("--months", type=int, default=6, help="取得する月数（デフォルト: 6、差分モード時は無視）")
    parser.add_argument(
        "--incremental", "-i",
        action="store_true",
        help="差分取得モード（前回以降に更新されたチケットのみ取得）"
    )
    args = parser.parse_args()

    main(months=args.months, incremental=args.incremental)
