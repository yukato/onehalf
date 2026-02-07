"""
Zendeskマクロのフィルタリングとエンベディング事前計算

出力:
- FAQ用マクロ: 【チャットボット使用可】タグ付きのみ
- 内部サポート用マクロ: 全マクロ（active, 1年以内, テンプレートあり）

フィルタ条件:
- active == true
- 更新日が1年以内
- comment_value_html（返信テンプレート）が存在する
"""

import json
import re
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from html import unescape

import numpy as np
from sentence_transformers import SentenceTransformer


def strip_html_tags(html: str) -> str:
    """HTMLタグを除去してプレーンテキストに変換（改行は保持）"""
    if not html:
        return ""
    # <br> タグを改行に変換
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    # </p>, </div>, </li> などのブロック要素終了タグを改行に変換
    text = re.sub(r"</(?:p|div|li|tr|h[1-6])>", "\n", text, flags=re.IGNORECASE)
    # 残りのHTMLタグを除去
    text = re.sub(r"<[^>]+>", "", text)
    # HTMLエンティティをデコード
    text = unescape(text)
    # 連続する空白（改行以外）を1つに
    text = re.sub(r"[^\S\n]+", " ", text)
    # 3つ以上の連続改行を2つに
    text = re.sub(r"\n{3,}", "\n\n", text)
    # 行頭・行末の空白を除去
    text = "\n".join(line.strip() for line in text.split("\n"))
    return text.strip()


def extract_comment_template(actions: list) -> str | None:
    """actionsからコメントテンプレートを抽出"""
    for action in actions:
        field = action.get("field", "")
        value = action.get("value", "")

        if field == "comment_value_html" and value:
            return strip_html_tags(value)
        elif field == "comment_value" and value:
            return value

    return None


def extract_chatbot_metadata(title: str) -> dict | None:
    """タイトルからチャットボット用メタデータを抽出

    例:
    - 【チャットボット使用可 女性】 → {"gender": "female", "status": None}
    - 【チャットボット使用可 男性/合格済み】 → {"gender": "male", "status": "合格済み"}
    - 【チャットボット使用可 男女共通/休会】 → {"gender": "both", "status": "休会"}

    Returns:
        メタデータ辞書、またはチャットボット使用可タグがない場合はNone
    """
    # 【チャットボット使用可 ...】を抽出
    match = re.search(r"【チャットボット使用可\s*([^】]*)】", title)
    if not match:
        return None

    tag_content = match.group(1).strip()
    if not tag_content:
        # 【チャットボット使用可】のみ（性別指定なし）→ 両性対象
        return {"gender": "both", "status": None}

    # 性別とステータスを分離（例: "男性/合格済み" → ["男性", "合格済み"]）
    parts = [p.strip() for p in tag_content.split("/")]

    gender_part = parts[0] if parts else ""
    status_part = parts[1] if len(parts) > 1 else None

    # 性別を正規化
    if "男女共通" in gender_part or "共通" in gender_part:
        gender = "both"
    elif "男性" in gender_part:
        gender = "male"
    elif "女性" in gender_part:
        gender = "female"
    else:
        gender = "both"  # デフォルトは両性対象

    return {
        "gender": gender,
        "status": status_part,
    }


def filter_macros(macros: list, max_age_days: int = 365, chatbot_only: bool = False) -> list:
    """有効なマクロをフィルタリング

    Args:
        macros: 生のマクロリスト
        max_age_days: マクロの最大経過日数
        chatbot_only: Trueの場合、【チャットボット使用可】タグ付きのみをフィルタ
    """
    cutoff_date = datetime.now() - timedelta(days=max_age_days)
    filtered = []

    for macro in macros:
        # 条件1: アクティブ
        if not macro.get("active"):
            continue

        # 条件2: 更新日が期限内
        updated_at = macro.get("updated_at", "")
        if updated_at:
            updated = datetime.fromisoformat(updated_at.replace("Z", "+00:00")).replace(tzinfo=None)
            if updated < cutoff_date:
                continue

        # 条件3: コメントテンプレートが存在
        comment_template = extract_comment_template(macro.get("actions", []))
        if not comment_template:
            continue

        title = macro.get("title", "")

        # 条件4（オプション）: チャットボット使用可タグ
        chatbot_meta = extract_chatbot_metadata(title)
        if chatbot_only and chatbot_meta is None:
            continue

        # フィルタ通過
        filtered.append({
            "macro_id": macro.get("id"),
            "title": title,
            "description": macro.get("description", ""),
            "comment_template": comment_template,
            "created_at": macro.get("created_at"),
            "updated_at": macro.get("updated_at"),
            "url": macro.get("url"),
            # チャットボット用メタデータ
            "chatbot_gender": chatbot_meta["gender"] if chatbot_meta else None,
            "chatbot_status": chatbot_meta["status"] if chatbot_meta else None,
        })

    return filtered


def prepare_macro_texts(macros: list) -> list:
    """マクロを検索用テキストに変換"""
    texts = []

    for macro in macros:
        # タイトル + 説明 + テンプレートの一部を検索対象に
        title = macro.get("title", "")
        description = macro.get("description", "") or ""
        template = macro.get("comment_template", "")

        # テンプレートは長いので先頭部分のみ使用
        template_preview = template[:500] if template else ""

        search_text = f"{title}\n{description}\n{template_preview}"
        texts.append(search_text)

    return texts


def save_macros_with_embeddings(
    macros: list,
    output_dir: Path,
    macros_filename: str,
    embeddings_filename: str,
    model: SentenceTransformer,
    label: str,
) -> None:
    """マクロとエンベディングを保存"""
    if not macros:
        print(f"  [{label}] 0件のためスキップ")
        return

    # マクロを保存
    macros_file = output_dir / macros_filename
    with open(macros_file, "w", encoding="utf-8") as f:
        json.dump(macros, f, ensure_ascii=False, indent=2)
    print(f"  [{label}] {len(macros)}件 -> {macros_file}")

    # エンベディング計算・保存
    texts = prepare_macro_texts(macros)
    embeddings = model.encode(texts, show_progress_bar=False)
    embeddings_file = output_dir / embeddings_filename
    np.save(embeddings_file, embeddings)
    print(f"  [{label}] Embeddings -> {embeddings_file} (shape: {embeddings.shape})")


def main():
    parser = argparse.ArgumentParser(description="マクロのエンベディング事前計算")
    parser.add_argument(
        "--input",
        type=str,
        help="入力マクロJSONファイル（省略時は最新ファイルを自動検出）",
    )
    parser.add_argument(
        "--max-age-days",
        type=int,
        default=365,
        help="マクロの最大経過日数（デフォルト: 365日）",
    )
    # 後方互換性のため残す（無視される）
    parser.add_argument(
        "--chatbot-only",
        action="store_true",
        help="（非推奨）FAQ用/内部用の両方を自動生成するため無視されます",
    )
    args = parser.parse_args()

    # 入力ファイル決定
    macros_dir = Path("data/zendesk_macros")
    if args.input:
        input_path = Path(args.input)
    else:
        # 最新のマクロファイルを検索
        macro_files = sorted(macros_dir.glob("macros_*.json"), reverse=True)
        if not macro_files:
            print("[ERROR] マクロファイルが見つかりません")
            print("  先に fetch_zendesk_macros.py を実行してください")
            return
        input_path = macro_files[0]

    output_dir = Path("data/macros")
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("マクロ エンベディング事前計算")
    print("=" * 60)

    # マクロデータをロード
    print(f"\n[1/4] マクロデータをロード中: {input_path}")
    with open(input_path, "r", encoding="utf-8") as f:
        raw_macros = json.load(f)
    print(f"  -> {len(raw_macros)}件のマクロ（Zendesk全体）")

    # フィルタリング
    print(f"\n[2/4] マクロをフィルタリング中...")
    print(f"  共通条件: active=true, 更新日{args.max_age_days}日以内, テンプレートあり")

    # 内部サポート用（全マクロ）
    internal_macros = filter_macros(raw_macros, max_age_days=args.max_age_days, chatbot_only=False)
    print(f"  -> 内部サポート用: {len(internal_macros)}件（全マクロ）")

    # FAQ用（【チャットボット使用可】タグ付きのみ）
    faq_macros = filter_macros(raw_macros, max_age_days=args.max_age_days, chatbot_only=True)
    print(f"  -> FAQ用: {len(faq_macros)}件（【チャットボット使用可】タグ付き）")

    # FAQ用マクロの性別分布を表示
    if faq_macros:
        gender_counts = {"male": 0, "female": 0, "both": 0}
        for m in faq_macros:
            gender = m.get("chatbot_gender", "both")
            if gender in gender_counts:
                gender_counts[gender] += 1
        print(f"     性別分布: 男性={gender_counts['male']}, 女性={gender_counts['female']}, 男女共通={gender_counts['both']}")

    # 内部サポート用マクロにFAQ使用可フラグを追加
    faq_macro_ids = {m["macro_id"] for m in faq_macros}
    for m in internal_macros:
        m["is_faq_enabled"] = m["macro_id"] in faq_macro_ids

    # エンベディングモデルをロード
    print(f"\n[3/4] エンベディングモデルをロード中...")
    model = SentenceTransformer("intfloat/multilingual-e5-small")

    # 保存
    print(f"\n[4/4] マクロとエンベディングを保存中...")

    # 内部サポート用
    save_macros_with_embeddings(
        internal_macros,
        output_dir,
        "internal_macros.json",
        "internal_macro_embeddings.npy",
        model,
        "内部サポート用",
    )

    # FAQ用
    save_macros_with_embeddings(
        faq_macros,
        output_dir,
        "faq_macros.json",
        "faq_macro_embeddings.npy",
        model,
        "FAQ用",
    )

    # 後方互換性のためfiltered_macros.jsonも作成（internal_macrosと同じ）
    # ※既存コードが参照している可能性があるため
    compat_file = output_dir / "filtered_macros.json"
    with open(compat_file, "w", encoding="utf-8") as f:
        json.dump(internal_macros, f, ensure_ascii=False, indent=2)
    print(f"  [後方互換] -> {compat_file}")

    # メタデータ
    metadata = {
        "internal_macros_count": len(internal_macros),
        "faq_macros_count": len(faq_macros),
        "embedding_dim": 384,
        "model": "intfloat/multilingual-e5-small",
        "source_file": str(input_path),
        "max_age_days": args.max_age_days,
        "created_at": datetime.now().isoformat(),
    }
    metadata_file = output_dir / "macro_metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print(f"  [メタデータ] -> {metadata_file}")

    # サマリー
    print(f"\n" + "=" * 60)
    print("完了！")
    print(f"  内部サポート用: {len(internal_macros)}件")
    print(f"  FAQ用: {len(faq_macros)}件")
    print(f"  出力ディレクトリ: {output_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
