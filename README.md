# バチェラーデート チャットボット

Zendesk FAQデータを活用したRAGベースのカスタマーサポートチャットボット

## 機能

| 機能                   | 説明                                         |
| ---------------------- | -------------------------------------------- |
| FAQ チャット           | ユーザー向けFAQチャットボット                |
| 内部サポートツール     | 過去のチケット対応履歴から対応案を提示       |
| ナレッジ改善レコメンド | AIが回答品質を評価し、FAQ改善提案を生成      |
| 管理者アカウント管理   | 管理画面へのアクセス権限をユーザー単位で管理 |
| チャット履歴           | ユーザーごとのチャット履歴を確認可能         |
| FAQ運用ルール管理      | チャットボットの応答ルールを動的に設定       |

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + Tailwind CSS + Prisma
- **バックエンド**: FastAPI + Python
- **RAG**: sentence-transformers (`intfloat/multilingual-e5-small`)
- **LLM**: Anthropic API (Claude 3.5 Sonnet) / OpenAI API
- **データベース**: AWS RDS MySQL（管理者認証）
- **インフラ**: AWS ECS Fargate + ALB + CloudFront + S3 + Athena

## アーキテクチャ

```
CloudFront (HTTPS)
    │
    ▼
ALB (HTTP:80)
    ├── /api/admin/auth/*  → Frontend (認証API)
    ├── /api/admin/users*  → Frontend (ユーザー管理API)
    ├── /api/*             → Backend  (その他API)
    └── /*                 → Frontend
    │
    ▼
ECS Fargate (2 containers)
    ├── frontend: Next.js ──→ RDS MySQL (認証)
    └── backend:  FastAPI ──→ S3 (ログ/運用ルール)
```

### 認証の仕組み

| 認証レイヤー   | 方式                       | 用途                           |
| -------------- | -------------------------- | ------------------------------ |
| ユーザー認証   | JWT (admin_users テーブル) | 管理画面へのログイン           |
| サービス間認証 | Basic Auth                 | Frontend → Backend API呼び出し |

---

## ローカル開発

### 前提条件

- Node.js 20以上
- Python 3.11以上
- Docker（MySQL用）
- Anthropic API キー

### セットアップ

```bash
# バックエンド（リポジトリ直下にvenv作成）
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# フロントエンド
cd frontend
npm install
cd ..
```

### Dockerでローカル環境を起動

```bash
docker-compose up -d
```

これにより以下が起動します：

- MySQL (port 3306): ユーザー `bdagent`, データベース `bd_agent`
- Frontend (port 3000)
- Backend (port 8000)

### データの準備

```bash
# FAQデータの取得（Zendesk API）
python scripts/export_articles.py

# チケットデータの取得（Zendesk API）
python scripts/fetch_solved_tickets.py

# Embeddingの事前計算
python scripts/precompute_embeddings.py
python scripts/precompute_ticket_embeddings.py
```

### 開発サーバーの起動（Docker不使用）

```bash
# 開発サーバー起動（フロントエンド + バックエンド）
./start-dev.sh
```

または個別に起動:

```bash
# バックエンド（別ターミナル）
source venv/bin/activate
cd backend
uvicorn app.main:app --reload --port 8000

# フロントエンド（別ターミナル）
cd frontend
npm run dev
```

**アクセスURL:**

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- APIドキュメント: http://localhost:8000/docs

### 認証情報

デフォルト管理者アカウント：

- メールアドレス: `yuki.kato@xvolve.com`
- パスワード: `chatbot2026`

Basic Auth（フロントエンド→バックエンド間）:

- ユーザー名: `bachelor`
- パスワード: `chatbot2026`

---

## デプロイ

### 初回セットアップ（1回のみ）

```bash
# ALBルーティング設定
./scripts/setup-alb-routing.sh

# RDS MySQLセットアップ
./scripts/setup-rds.sh

# データベースマイグレーション
./scripts/migrate-rds.sh
```

### デプロイ実行

```bash
./scripts/deploy.sh
```

詳細は `docs/deployment.md` を参照

### 本番環境URL

| 項目         | URL                                                                     |
| ------------ | ----------------------------------------------------------------------- |
| 本番 (HTTPS) | https://d2xoqu91pyhs8a.cloudfront.net                                   |
| ALB直接      | http://bachelor-chatbot-alb-2043869810.ap-northeast-1.elb.amazonaws.com |

---

## プロジェクト構成

```
bachelor-chat-bot/
├── frontend/               # Next.js フロントエンド
│   ├── app/               # App Router ページ
│   │   ├── admin/         # 管理者関連ページ
│   │   ├── api/admin/     # 認証・ユーザー管理API
│   │   ├── faq/           # FAQチャット
│   │   ├── internal/      # 内部サポート
│   │   ├── improvements/  # ナレッジ改善
│   │   ├── history/       # 履歴
│   │   └── settings/      # 設定
│   ├── components/        # UIコンポーネント
│   ├── lib/               # APIクライアント・認証
│   └── prisma/            # Prismaスキーマ・マイグレーション
├── backend/               # FastAPI バックエンド
│   └── app/
│       ├── main.py        # エントリーポイント
│       ├── routers/       # APIエンドポイント
│       └── services/      # RAGエンジン等
├── scripts/
│   ├── deploy.sh          # デプロイスクリプト
│   ├── setup-alb-routing.sh
│   ├── setup-rds.sh       # RDSセットアップ
│   ├── migrate-rds.sh     # DBマイグレーション
│   ├── export_articles.py
│   ├── fetch_solved_tickets.py
│   └── precompute_*.py
├── data/                  # データファイル（gitignore）
├── docker/
│   └── mysql/init.sql     # ローカルMySQL初期化
├── infra/
│   └── ecs-task-definition.json
├── docs/
│   └── deployment.md
├── Dockerfile.frontend
├── Dockerfile.backend
└── docker-compose.yml
```

---

## データベーススキーマ

```sql
-- 管理者ユーザー
admin_users
├── id (UUID)
├── email (UNIQUE)
├── username
├── password (bcrypt)
├── role (admin/super_admin)
├── is_active
├── created_at
├── updated_at
└── last_login

-- セッション管理
admin_sessions
├── id (UUID)
├── user_id (FK → admin_users)
├── refresh_token (UNIQUE)
├── user_agent
├── ip_address
├── expires_at
└── created_at
```

---

## トラブルシューティング

### Anthropic APIに接続できない

```bash
# 環境変数を確認
echo $ANTHROPIC_API_KEY

# .envファイルにAPIキーが設定されているか確認
cat .env | grep ANTHROPIC
```

### ポートが使用中

```bash
# 使用中のポートを確認
lsof -i :3000
lsof -i :8000

# プロセスを停止
kill -9 <PID>
```

### Prisma Clientのエラー

```bash
# Prisma Clientを再生成
cd frontend
npx prisma generate
```

### ローカルMySQLに接続できない

```bash
# Dockerコンテナの状態を確認
docker-compose ps

# MySQLログを確認
docker-compose logs mysql
```
