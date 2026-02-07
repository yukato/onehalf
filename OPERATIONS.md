# 運用手順書

このドキュメントでは、RAGチャットボットのデータ更新に関する運用手順を定義します。

## 更新頻度

**毎日1回**（推奨: 業務開始前または業務終了後）

## データの種類

| データ             | ファイル                                 | 説明                      |
| ------------------ | ---------------------------------------- | ------------------------- |
| ヘルプセンター記事 | `data/articles/all_articles.json`        | Zendesk Help Centerの記事 |
| 解決済みチケット   | `data/tickets/solved_tickets.json`       | 過去の対応事例            |
| マクロ             | `data/macros/macros.json`                | Zendeskマクロテンプレート |
| 記事Embedding      | `data/embeddings/article_embeddings.npy` | RAG検索用ベクトル         |
| チケットEmbedding  | `data/tickets/ticket_embeddings.npy`     | RAG検索用ベクトル         |
| マクロEmbedding    | `data/macros/macro_embeddings.npy`       | RAG検索用ベクトル         |

---

## 日次更新手順

### 1. 差分更新（推奨）

前回取得以降に更新されたデータのみを取得します。

```bash
# 仮想環境を有効化
source venv/bin/activate

# 記事データの差分更新
python scripts/export_articles.py --incremental

# 記事Embeddingの再計算
python scripts/precompute_embeddings.py

# チケットデータの差分更新
python scripts/fetch_solved_tickets.py --incremental

# チケットEmbeddingの再計算
python scripts/precompute_ticket_embeddings.py

# マクロデータの更新
python scripts/fetch_zendesk_macros.py

# マクロEmbeddingの計算
python scripts/precompute_macro_embeddings.py
```

### 2. 全件更新（初回または完全リフレッシュ時）

```bash
# 仮想環境を有効化
source venv/bin/activate

# 記事データの全件取得
python scripts/export_articles.py

# 記事Embeddingの計算
python scripts/precompute_embeddings.py

# チケットデータの全件取得（6ヶ月分、時間がかかります）
python scripts/fetch_solved_tickets.py --months 6

# チケットEmbeddingの計算
python scripts/precompute_ticket_embeddings.py

# マクロデータの取得
python scripts/fetch_zendesk_macros.py

# マクロEmbeddingの計算
python scripts/precompute_macro_embeddings.py
```

---

## ワンライナー（コピペ用）

### 差分更新（日次運用向け）

```bash
source venv/bin/activate && \
  python scripts/export_articles.py --incremental && \
  python scripts/precompute_embeddings.py && \
  python scripts/fetch_solved_tickets.py --incremental && \
  python scripts/precompute_ticket_embeddings.py && \
  python scripts/fetch_zendesk_macros.py && \
  python scripts/precompute_macro_embeddings.py
```

### 全件更新

```bash
source venv/bin/activate && \
  python scripts/export_articles.py && \
  python scripts/precompute_embeddings.py && \
  python scripts/fetch_solved_tickets.py --months 6 && \
  python scripts/precompute_ticket_embeddings.py && \
  python scripts/fetch_zendesk_macros.py && \
  python scripts/precompute_macro_embeddings.py
```

---

## 処理時間の目安

| 処理              | 差分更新   | 全件更新      |
| ----------------- | ---------- | ------------- |
| 記事取得          | 〜1分      | 〜2分         |
| 記事Embedding     | 〜10秒     | 〜10秒        |
| チケット取得      | 〜5分      | 〜2時間       |
| チケットEmbedding | 〜5分      | 〜5分         |
| マクロ取得        | 〜30秒     | 〜30秒        |
| マクロEmbedding   | 〜10秒     | 〜10秒        |
| **合計**          | **〜12分** | **〜2時間超** |

---

## コマンドオプション

### export_articles.py

| オプション            | 説明                                               |
| --------------------- | -------------------------------------------------- |
| `--incremental`, `-i` | 差分取得モード（前回以降に更新された記事のみ取得） |

### fetch_solved_tickets.py

| オプション            | 説明                                                        |
| --------------------- | ----------------------------------------------------------- |
| `--incremental`, `-i` | 差分取得モード（前回以降に更新されたチケットのみ取得）      |
| `--months N`          | 取得する月数を指定（デフォルト: 6ヶ月、差分モード時は無視） |

---

## トラブルシューティング

### 「既存データなし」と表示される

差分モードでも、`all_articles.json` または `solved_tickets.json` が存在しない場合は全件取得が実行されます。これは正常な動作です。

### Zendesk API エラー

- **401 Unauthorized**: `.env` ファイルの認証情報を確認してください
- **422 Unprocessable Entity**: Zendesk Search APIの1,000件制限に達しました。週ごとの分割取得で自動的に対処されます
- **429 Too Many Requests**: レート制限です。しばらく待ってから再実行してください

### ログファイル

チケット取得のログは `logs/fetch_tickets_YYYYMMDD_HHMMSS.log` に保存されます。

---

## バッチスクリプト

日次更新用のバッチスクリプトが用意されています。

```bash
# 差分更新（推奨）
./scripts/daily_update.sh

# 全件更新
./scripts/daily_update.sh --full
```

---

## 注意事項

1. **本番環境への反映**: データ更新後、チャットボットサービスを再起動することで新しいデータが読み込まれます
2. **Embedding再計算**: データを更新したら、必ず対応するEmbeddingも再計算してください
3. **個人情報**: チケットデータは取得時に自動的にマスク処理されます（メールアドレス、電話番号、名前など）
4. **更新間隔**: 差分取得は日ごとに分割して実行されるため、1週間以上更新を忘れても問題なく動作します
