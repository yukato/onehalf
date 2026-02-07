# Bachelor Chatbot デプロイ手順

## 概要

Next.js (フロントエンド) + FastAPI (バックエンド) の2コンテナ構成をAWS ECS Fargateにデプロイします。
管理者認証にはAWS RDS MySQLを使用します。

## アーキテクチャ

```
CloudFront (HTTPS)
    │
    ▼
ALB (HTTP:80)
    ├── /api/admin/auth/*  → Frontend (port 3000) [認証API]
    ├── /api/admin/users*  → Frontend (port 3000) [ユーザー管理API]
    ├── /api/*             → Backend  (port 8000) [その他API]
    └── /*                 → Frontend (port 3000)
    │
    ▼
ECS Fargate (2 containers in 1 task)
    ├── frontend: Next.js (port 3000)
    │       │
    │       └──→ RDS MySQL (管理者認証)
    │
    └── backend:  FastAPI (port 8000)
            │
            └──→ S3 (チャットログ/運用ルール)
```

### 認証アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        認証フロー                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ブラウザ                                                        │
│    │                                                            │
│    │ 1. ログイン (email/password)                                │
│    ▼                                                            │
│  Frontend (Next.js API Routes)                                  │
│    │                                                            │
│    │ 2. DBで認証 → JWT発行                                       │
│    ▼                                                            │
│  RDS MySQL (admin_users, admin_sessions)                        │
│                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                 │
│  ブラウザ                                                        │
│    │                                                            │
│    │ 3. API呼び出し (Bearer Token)                               │
│    ▼                                                            │
│  Frontend ──────────────────────────────────────────────────────│
│    │                                                            │
│    │ 4. Basic Auth (サービス間認証)                              │
│    ▼                                                            │
│  Backend (FastAPI)                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 前提条件

- AWS CLI がインストール・設定済み
- Docker が起動中
- 適切なIAM権限がある

## 初回セットアップ（1回のみ）

### 1. ALBのパスベースルーティングを設定

```bash
./scripts/setup-alb-routing.sh
```

これにより以下が作成されます：

- Frontend用ターゲットグループ (port 3000)
- Backend用ターゲットグループ (port 8000)
- ALBリスナールール

### 2. RDS MySQLのセットアップ

```bash
./scripts/setup-rds.sh
```

これにより以下が作成されます：

- RDS MySQL インスタンス (`bachelor-chatbot-db`)
- セキュリティグループ (ECSからのアクセスのみ許可)
- DBサブネットグループ
- Secrets Managerにデータベース接続文字列を保存

### 3. データベースマイグレーション

```bash
./scripts/migrate-rds.sh
```

Prismaマイグレーションとシードデータを実行します。

## 通常のデプロイ

```bash
./scripts/deploy.sh
```

スクリプトが実行する内容：

1. ECRにログイン
2. ECRリポジトリの確認・作成
3. セキュリティグループの確認・更新
4. バックエンドDockerイメージをビルド
5. フロントエンドDockerイメージをビルド（Prisma Client生成含む）
6. イメージをECRにプッシュ
7. CloudWatch Logsグループの確認・作成
8. ECSタスク定義を登録
9. ECSサービスを更新（ローリングアップデート）

## アクセス情報

| 項目            | URL                                                                     |
| --------------- | ----------------------------------------------------------------------- |
| 本番URL (HTTPS) | https://d2xoqu91pyhs8a.cloudfront.net                                   |
| ALB直接 (HTTP)  | http://bachelor-chatbot-alb-2043869810.ap-northeast-1.elb.amazonaws.com |

### 認証情報

デフォルトの管理者アカウント：

- メールアドレス: `yuki.kato@xvolve.com`
- パスワード: `chatbot2026`

※ 管理画面から追加ユーザーを作成可能

## 監視・トラブルシューティング

### デプロイ状況の確認

```bash
aws ecs describe-services \
  --cluster bachelor-chatbot-cluster \
  --services bachelor-chatbot-service \
  --region ap-northeast-1 \
  --query 'services[0].deployments'
```

### ログの確認

```bash
# リアルタイムでログを確認
aws logs tail /ecs/bachelor-chatbot --follow

# 過去10分のログ
aws logs tail /ecs/bachelor-chatbot --since 10m
```

### ターゲットヘルス確認

```bash
# フロントエンド
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:ap-northeast-1:140493024080:targetgroup/bachelor-chatbot-frontend-tg/3bd3c60660035083

# バックエンド
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:ap-northeast-1:140493024080:targetgroup/bachelor-chatbot-backend-tg/35208fa5ff67d99e
```

### タスク状態の確認

```bash
aws ecs list-tasks \
  --cluster bachelor-chatbot-cluster \
  --service-name bachelor-chatbot-service \
  --region ap-northeast-1
```

### RDS接続確認

```bash
# RDSエンドポイントの確認
aws rds describe-db-instances \
  --db-instance-identifier bachelor-chatbot-db \
  --query 'DBInstances[0].Endpoint'
```

## よくある問題と解決方法

### 504 Gateway Timeout

1. ターゲットヘルスがunhealthyでないか確認
2. セキュリティグループでポート3000/8000が許可されているか確認
3. コンテナログでエラーがないか確認

### CloudFrontで古いコンテンツが表示される

キャッシュを無効化：

```bash
aws cloudfront create-invalidation \
  --distribution-id E2Z0PQVTA8ALHR \
  --paths "/*"
```

### サービスがDRAINING状態で止まっている

デプロイスクリプトが自動的にDRAINING完了を待機します。
手動で確認する場合：

```bash
aws ecs describe-services \
  --cluster bachelor-chatbot-cluster \
  --services bachelor-chatbot-service \
  --region ap-northeast-1 \
  --query 'services[0].status'
```

### Prisma Client のバイナリエラー

ECS上で `PrismaClientInitializationError` が発生する場合、`frontend/prisma/schema.prisma` の `binaryTargets` を確認：

```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../lib/generated/prisma"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

### セッションが維持されない（デプロイ後にログアウトされる）

JWT_SECRETがSecrets Managerで永続化されているか確認：

```bash
aws secretsmanager describe-secret \
  --secret-id bachelor-chatbot/jwt-secret \
  --region ap-northeast-1
```

## チャットログ (S3 + Athena) セットアップ

チャット履歴をS3に保存し、Athenaでクエリできるようにするための設定です。

### 1. S3バケット作成

```bash
aws s3 mb s3://bachelor-chatbot-logs --region ap-northeast-1
```

### 2. IAMポリシー追加

ECSタスクロールにS3とAthena権限を追加：

```bash
# S3アクセス権限
aws iam put-role-policy --role-name ecsTaskRole --policy-name S3ChatLogsAccess --policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::bachelor-chatbot-logs", "arn:aws:s3:::bachelor-chatbot-logs/*"]
    }
  ]
}'

# Athena/Glue権限
aws iam put-role-policy --role-name ecsTaskRole --policy-name AthenaAccess --policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["athena:StartQueryExecution", "athena:GetQueryExecution", "athena:GetQueryResults", "athena:StopQueryExecution"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["glue:GetDatabase", "glue:GetTable", "glue:GetPartitions", "glue:BatchCreatePartition"],
      "Resource": "*"
    }
  ]
}'
```

### 3. Athenaデータベース・テーブル作成

```bash
# データベース作成
aws athena start-query-execution \
  --query-string "CREATE DATABASE IF NOT EXISTS bachelor_chatbot" \
  --result-configuration "OutputLocation=s3://bachelor-chatbot-logs/athena-results/" \
  --region ap-northeast-1

# チャットログテーブル作成（パーティション投影）
aws athena start-query-execution \
  --query-string "CREATE EXTERNAL TABLE IF NOT EXISTS bachelor_chatbot.chat_logs (
    session_id STRING, message_id STRING, timestamp STRING, endpoint STRING,
    log_type STRING, category STRING, query STRING, answer STRING,
    duration_ms INT, sources_count INT, username STRING, quality_assessment STRING
  ) PARTITIONED BY (year STRING, month STRING, day STRING, hour STRING)
  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
  LOCATION 's3://bachelor-chatbot-logs/chat-logs/'
  TBLPROPERTIES ('projection.enabled'='true',
    'projection.year.type'='integer', 'projection.year.range'='2024,2030',
    'projection.month.type'='integer', 'projection.month.range'='1,12', 'projection.month.digits'='2',
    'projection.day.type'='integer', 'projection.day.range'='1,31', 'projection.day.digits'='2',
    'projection.hour.type'='integer', 'projection.hour.range'='0,23', 'projection.hour.digits'='2',
    'storage.location.template'='s3://bachelor-chatbot-logs/chat-logs/year=\${year}/month=\${month}/day=\${day}/hour=\${hour}')" \
  --result-configuration "OutputLocation=s3://bachelor-chatbot-logs/athena-results/" \
  --region ap-northeast-1

# ログインログテーブル作成
aws athena start-query-execution \
  --query-string "CREATE EXTERNAL TABLE IF NOT EXISTS bachelor_chatbot.login_logs (
    event_id STRING, timestamp STRING, event_type STRING, username STRING,
    ip_address STRING, user_agent STRING, success BOOLEAN,
    country STRING, country_code STRING, region STRING, city STRING, isp STRING
  ) PARTITIONED BY (year STRING, month STRING, day STRING)
  ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
  LOCATION 's3://bachelor-chatbot-logs/login-logs/'
  TBLPROPERTIES ('projection.enabled'='true',
    'projection.year.type'='integer', 'projection.year.range'='2024,2030',
    'projection.month.type'='integer', 'projection.month.range'='1,12', 'projection.month.digits'='2',
    'projection.day.type'='integer', 'projection.day.range'='1,31', 'projection.day.digits'='2',
    'storage.location.template'='s3://bachelor-chatbot-logs/login-logs/year=\${year}/month=\${month}/day=\${day}')" \
  --result-configuration "OutputLocation=s3://bachelor-chatbot-logs/athena-results/" \
  --region ap-northeast-1
```

### 4. ECSタスク定義に環境変数を追加

`infra/ecs-task-definition.json` のbackendコンテナに追加：

```json
{
  "name": "CHAT_LOGS_BUCKET",
  "value": "bachelor-chatbot-logs"
}
```

## シークレット管理 (AWS Secrets Manager)

APIキーなどの機密情報はAWS Secrets Managerで管理し、ECSタスク定義から参照します。

### 登録済みシークレット

| シークレット名                     | 用途                  | 参照先   |
| ---------------------------------- | --------------------- | -------- |
| bachelor-chatbot/anthropic-api-key | Claude API            | Backend  |
| bachelor-chatbot/openai-api-key    | OpenAI API            | Backend  |
| bachelor-chatbot/bugsnag-api-key   | エラー監視 (Bugsnag)  | Backend  |
| bachelor-chatbot/database-url      | MySQL接続文字列       | Frontend |
| bachelor-chatbot/jwt-secret        | JWT署名用シークレット | Frontend |

### 新しいシークレットの追加手順

**1. Secrets Managerにシークレットを作成**

```bash
aws secretsmanager create-secret \
  --name bachelor-chatbot/<secret-name> \
  --secret-string "<secret-value>" \
  --region ap-northeast-1
```

出力されるARNをメモします（例：`arn:aws:secretsmanager:ap-northeast-1:140493024080:secret:bachelor-chatbot/example-AbCdEf`）

**2. ECSタスク定義に追加**

`infra/ecs-task-definition.json` の `secrets` セクションに追加：

```json
{
  "name": "ENV_VAR_NAME",
  "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:140493024080:secret:bachelor-chatbot/<secret-name>-<suffix>"
}
```

**3. IAM権限の確認**

`ecsTaskExecutionRole` に以下の権限が必要です：

```json
{
  "Effect": "Allow",
  "Action": ["secretsmanager:GetSecretValue"],
  "Resource": "arn:aws:secretsmanager:ap-northeast-1:140493024080:secret:bachelor-chatbot/*"
}
```

### シークレット値の更新

```bash
aws secretsmanager update-secret \
  --secret-id bachelor-chatbot/<secret-name> \
  --secret-string "<new-value>" \
  --region ap-northeast-1
```

更新後、ECSサービスを再デプロイして反映：

```bash
./scripts/deploy.sh
```

### フロントエンドのビルド時変数

Next.jsの `NEXT_PUBLIC_*` 環境変数はビルド時に埋め込まれるため、Secrets Managerではなく `Dockerfile.frontend` のビルド引数として渡します。

```dockerfile
# Dockerfile.frontend
ARG NEXT_PUBLIC_BUGSNAG_API_KEY
ARG NEXT_PUBLIC_BASIC_AUTH_USER
ARG NEXT_PUBLIC_BASIC_AUTH_PASSWORD

ENV NEXT_PUBLIC_BUGSNAG_API_KEY=${NEXT_PUBLIC_BUGSNAG_API_KEY}
ENV NEXT_PUBLIC_BASIC_AUTH_USER=${NEXT_PUBLIC_BASIC_AUTH_USER}
ENV NEXT_PUBLIC_BASIC_AUTH_PASSWORD=${NEXT_PUBLIC_BASIC_AUTH_PASSWORD}
```

## AWSリソース一覧

| リソース                      | ID/ARN                             |
| ----------------------------- | ---------------------------------- |
| VPC                           | vpc-e6f8de81                       |
| ECSクラスター                 | bachelor-chatbot-cluster           |
| ECSサービス                   | bachelor-chatbot-service           |
| ALB                           | bachelor-chatbot-alb-2043869810    |
| CloudFront                    | E2Z0PQVTA8ALHR                     |
| セキュリティグループ (タスク) | sg-0689344e12dc4f031               |
| セキュリティグループ (ALB)    | sg-049aed072460c081b               |
| ECR (Frontend)                | bachelor-chatbot-frontend          |
| ECR (Backend)                 | bachelor-chatbot-backend           |
| RDS MySQL                     | bachelor-chatbot-db                |
| S3 (チャットログ)             | bachelor-chatbot-logs              |
| Athenaデータベース            | bachelor_chatbot                   |
| Secrets Manager               | bachelor-chatbot/anthropic-api-key |
| Secrets Manager               | bachelor-chatbot/openai-api-key    |
| Secrets Manager               | bachelor-chatbot/bugsnag-api-key   |
| Secrets Manager               | bachelor-chatbot/database-url      |
| Secrets Manager               | bachelor-chatbot/jwt-secret        |
