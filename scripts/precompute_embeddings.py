"""
事前にEmbeddingを計算してファイルに保存するスクリプト
これにより、起動時のベクトル化処理（約30秒）をスキップできる
"""

import json
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer


def precompute_embeddings(
    articles_path: str = "data/articles/all_articles.json",
    output_dir: str = "data/embeddings",
    embedding_model: str = "intfloat/multilingual-e5-small",
):
    """記事のEmbeddingを事前計算して保存"""

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # 記事データをロード
    print(f"記事データをロード中: {articles_path}")
    with open(articles_path, "r", encoding="utf-8") as f:
        articles = json.load(f)
    print(f"  -> {len(articles)}件の記事を読み込み")

    # Embeddingモデルをロード
    print(f"Embeddingモデルをロード中: {embedding_model}")
    model = SentenceTransformer(embedding_model)

    # 記事をベクトル化
    print("記事をベクトル化中...")
    texts = [f"{a['title']}\n{a['body_text']}" for a in articles]
    embeddings = model.encode(texts, show_progress_bar=True)

    # 保存
    embeddings_file = output_path / "article_embeddings.npy"
    np.save(embeddings_file, embeddings)
    print(f"  -> Embeddings保存完了: {embeddings_file}")
    print(f"     Shape: {embeddings.shape}")

    # メタデータも保存（どのモデル・記事で作成したか）
    metadata = {
        "embedding_model": embedding_model,
        "articles_path": articles_path,
        "num_articles": len(articles),
        "embedding_dim": embeddings.shape[1],
    }
    metadata_file = output_path / "metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print(f"  -> メタデータ保存完了: {metadata_file}")

    print("\n事前計算完了!")
    print(f"起動時は {embeddings_file} から読み込むことで、ベクトル化処理をスキップできます")


if __name__ == "__main__":
    precompute_embeddings()
