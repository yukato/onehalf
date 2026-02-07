"""
チケットデータのEmbeddingを事前計算するスクリプト
"""

import json
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer


def prepare_ticket_texts(tickets: list) -> list:
    """チケットを検索用テキストに変換"""
    texts = []

    for ticket in tickets:
        # 顧客からの質問を抽出
        customer_messages = [
            c["body"] for c in ticket["comments"]
            if not c["is_staff"] and c["public"]
        ]

        # 質問テキストを構築
        question = ticket.get("subject", "")
        if customer_messages:
            question += "\n" + "\n".join(customer_messages[:2])  # 最初の2つのメッセージ

        # タグも検索対象に含める（カテゴリ検索用）
        tags = " ".join(ticket.get("tags", []))

        # 検索用テキスト
        search_text = f"{question}\n{tags}"
        texts.append(search_text)

    return texts


def main():
    tickets_path = Path("data/tickets/solved_tickets.json")
    output_dir = Path("data/tickets")

    print(f"チケットデータをロード中: {tickets_path}")
    with open(tickets_path, "r", encoding="utf-8") as f:
        tickets = json.load(f)
    print(f"  -> {len(tickets)}件のチケット")

    print("検索用テキストを準備中...")
    texts = prepare_ticket_texts(tickets)

    print("Embeddingモデルをロード中...")
    model = SentenceTransformer("intfloat/multilingual-e5-small")

    print("Embeddingを計算中...")
    embeddings = model.encode(texts, show_progress_bar=True)

    # 保存
    embeddings_file = output_dir / "ticket_embeddings.npy"
    np.save(embeddings_file, embeddings)
    print(f"  -> Embeddings保存完了: {embeddings_file}")
    print(f"     Shape: {embeddings.shape}")

    # メタデータ
    metadata = {
        "num_tickets": len(tickets),
        "embedding_dim": embeddings.shape[1],
        "model": "intfloat/multilingual-e5-small",
    }
    metadata_file = output_dir / "ticket_metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print("\n事前計算完了!")


if __name__ == "__main__":
    main()
