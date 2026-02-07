#!/bin/bash

# Bachelor Chatbot デプロイスクリプト (Next.js + FastAPI)
# Usage: ./scripts/deploy.sh [-q|--quick] [--changed-only|--only-backend|--only-frontend]
#
# オプション:
#   -q, --quick        デプロイ監視をスキップ（高速モード）
#   --changed-only     変更のある側のみビルド・プッシュ
#   --only-backend     バックエンドのみビルド・プッシュ
#   --only-frontend    フロントエンドのみビルド・プッシュ
#
# 前提条件:
#   - AWS CLI が設定済み
#   - Docker が起動中
#   - ALBルーティングが設定済み (初回のみ ./scripts/setup-alb-routing.sh を実行)

set -e

# オプション解析
SKIP_MONITORING=false
CHANGED_ONLY=false
ONLY_BACKEND=false
ONLY_FRONTEND=false
while [[ $# -gt 0 ]]; do
  case $1 in
    -q|--quick)
      SKIP_MONITORING=true
      shift
      ;;
    --changed-only)
      CHANGED_ONLY=true
      shift
      ;;
    --only-backend)
      ONLY_BACKEND=true
      shift
      ;;
    --only-frontend)
      ONLY_FRONTEND=true
      shift
      ;;
    *)
      echo "不明なオプション: $1"
      exit 1
      ;;
  esac
done

# 設定
AWS_ACCOUNT_ID="140493024080"
AWS_REGION="ap-northeast-1"
ECS_CLUSTER="bachelor-chatbot-cluster"
ECS_SERVICE="bachelor-chatbot-service"
TASK_DEFINITION="bachelor-chatbot"
IMAGE_TAG="latest"

# ネットワーク設定
SUBNETS="subnet-728c6659,subnet-2f8c6f67,subnet-0e0e5355"
SECURITY_GROUP="sg-0689344e12dc4f031"
ALB_SECURITY_GROUP="sg-049aed072460c081b"

# ECRリポジトリ
ECR_FRONTEND="bachelor-chatbot-frontend"
ECR_BACKEND="bachelor-chatbot-backend"
ECR_URI_FRONTEND="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_FRONTEND}"
ECR_URI_BACKEND="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_BACKEND}"

# CloudFront
CLOUDFRONT_DISTRIBUTION_ID="E2Z0PQVTA8ALHR"

# Bugsnag (frontend build-time variable)
BUGSNAG_API_KEY="f4a034abfec553486533059718b8ac2b"

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

echo "=========================================="
echo "Bachelor Chatbot デプロイ開始"
echo "=========================================="
echo ""

# 対象判定（gitがない/変更なしの場合は両方）
BUILD_BACKEND=true
BUILD_FRONTEND=true

if [ "$ONLY_BACKEND" = true ] && [ "$ONLY_FRONTEND" = true ]; then
  echo "✗ --only-backend と --only-frontend は同時に指定できません"
  exit 1
fi

if [ "$ONLY_BACKEND" = true ]; then
  BUILD_FRONTEND=false
fi

if [ "$ONLY_FRONTEND" = true ]; then
  BUILD_BACKEND=false
fi

if [ "$CHANGED_ONLY" = true ]; then
  if command -v git >/dev/null 2>&1; then
    CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || true)
    CHANGED_COUNT=$(echo "$CHANGED_FILES" | sed '/^$/d' | wc -l | tr -d ' ')
    if echo "$CHANGED_FILES" | grep -E -q '^(backend/|Dockerfile\.backend)'; then
      BUILD_BACKEND=true
    else
      BUILD_BACKEND=false
    fi
    if echo "$CHANGED_FILES" | grep -E -q '^(frontend/|Dockerfile\.frontend)'; then
      BUILD_FRONTEND=true
    else
      BUILD_FRONTEND=false
    fi
    if [ "$BUILD_BACKEND" = false ] && [ "$BUILD_FRONTEND" = false ]; then
      BUILD_BACKEND=true
      BUILD_FRONTEND=true
    fi
    if [ "$CHANGED_COUNT" = "0" ]; then
      echo "changed-only: 変更が検出されないため両方ビルド"
    else
      echo "changed-only: 変更ファイル数 ${CHANGED_COUNT}"
    fi
  else
    echo "changed-only: gitが見つからないため両方ビルド"
  fi
fi

echo "ビルド対象:"
echo "  - backend:  $BUILD_BACKEND"
echo "  - frontend: $BUILD_FRONTEND"
echo ""

# 1. ECRにログイン
echo "[1/9] ECRにログイン中..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
echo "✓ ECRログイン完了"
echo ""

# 2. ECRリポジトリの確認・作成
echo "[2/9] ECRリポジトリを確認中..."
aws ecr describe-repositories --repository-names ${ECR_FRONTEND} --region ${AWS_REGION} > /dev/null 2>&1 || \
  aws ecr create-repository --repository-name ${ECR_FRONTEND} --region ${AWS_REGION} > /dev/null
aws ecr describe-repositories --repository-names ${ECR_BACKEND} --region ${AWS_REGION} > /dev/null 2>&1 || \
  aws ecr create-repository --repository-name ${ECR_BACKEND} --region ${AWS_REGION} > /dev/null
echo "✓ ECRリポジトリ確認完了"
echo ""

# 3. セキュリティグループの確認・更新
echo "[3/9] セキュリティグループを確認中..."
# Port 3000 (Frontend)
if ! aws ec2 describe-security-groups --group-ids ${SECURITY_GROUP} --region ${AWS_REGION} \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`3000\`]" --output text | grep -q "3000"; then
  echo "  ポート 3000 のルールを追加中..."
  aws ec2 authorize-security-group-ingress \
    --group-id ${SECURITY_GROUP} \
    --protocol tcp \
    --port 3000 \
    --source-group ${ALB_SECURITY_GROUP} \
    --region ${AWS_REGION} > /dev/null 2>&1 || true
fi
# Port 8000 (Backend)
if ! aws ec2 describe-security-groups --group-ids ${SECURITY_GROUP} --region ${AWS_REGION} \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`8000\`]" --output text | grep -q "8000"; then
  echo "  ポート 8000 のルールを追加中..."
  aws ec2 authorize-security-group-ingress \
    --group-id ${SECURITY_GROUP} \
    --protocol tcp \
    --port 8000 \
    --source-group ${ALB_SECURITY_GROUP} \
    --region ${AWS_REGION} > /dev/null 2>&1 || true
fi
echo "✓ セキュリティグループ確認完了"
echo ""

# 4-6. バックエンド・フロントエンドイメージを並列ビルド＆プッシュ
echo "[4-6/9] イメージを並列ビルド＆プッシュ中..."
export DOCKER_BUILDKIT=1

# buildx builder を用意（registry cache 用に docker-container driver を使用）
if ! docker buildx inspect ecr-cache >/dev/null 2>&1; then
  docker buildx create --name ecr-cache --driver docker-container --use >/dev/null
else
  docker buildx use ecr-cache >/dev/null
fi

if [ "$BUILD_BACKEND" = true ]; then
  docker buildx build --platform linux/amd64 \
    -t ${ECR_URI_BACKEND}:${IMAGE_TAG} \
    -f Dockerfile.backend \
    --cache-from type=registry,ref=${ECR_URI_BACKEND}:buildcache \
    --cache-to type=registry,ref=${ECR_URI_BACKEND}:buildcache,mode=max \
    --push . &
  PID_BACKEND=$!
else
  PID_BACKEND=""
  echo "  - バックエンド: スキップ"
fi

if [ "$BUILD_FRONTEND" = true ]; then
  docker buildx build --platform linux/amd64 \
    -t ${ECR_URI_FRONTEND}:${IMAGE_TAG} \
    -f Dockerfile.frontend \
    --build-arg NEXT_PUBLIC_BUGSNAG_API_KEY=${BUGSNAG_API_KEY} \
    --cache-from type=registry,ref=${ECR_URI_FRONTEND}:buildcache \
    --cache-to type=registry,ref=${ECR_URI_FRONTEND}:buildcache,mode=max \
    --push . &
  PID_FRONTEND=$!
else
  PID_FRONTEND=""
  echo "  - フロントエンド: スキップ"
fi

if [ -n "$PID_BACKEND" ]; then
  wait $PID_BACKEND || { echo "✗ バックエンドビルド/プッシュ失敗"; exit 1; }
  echo "  ✓ バックエンドビルド/プッシュ完了"
fi

if [ -n "$PID_FRONTEND" ]; then
  wait $PID_FRONTEND || { echo "✗ フロントエンドビルド/プッシュ失敗"; exit 1; }
  echo "  ✓ フロントエンドビルド/プッシュ完了"
fi

echo "✓ 並列ビルド＆プッシュ完了"
echo ""

# 7. CloudWatch Logsグループの確認・作成
echo "[7/9] CloudWatch Logsグループを確認中..."
aws logs describe-log-groups --log-group-name-prefix /ecs/bachelor-chatbot --region ${AWS_REGION} 2>/dev/null | grep -q "/ecs/bachelor-chatbot" || \
  aws logs create-log-group --log-group-name /ecs/bachelor-chatbot --region ${AWS_REGION}
echo "✓ ロググループ確認完了"
echo ""

# 8. タスク定義を登録
echo "[8/9] タスク定義を更新中..."
aws ecs register-task-definition \
  --cli-input-json file://infra/ecs-task-definition.json \
  --region ${AWS_REGION} > /dev/null
echo "✓ タスク定義更新完了"
echo ""

# 9. ECSサービスを更新または作成
echo "[9/9] ECSサービスを更新中..."

# ターゲットグループARNを取得
FRONTEND_TG_ARN=$(aws elbv2 describe-target-groups \
  --names bachelor-chatbot-frontend-tg \
  --region ${AWS_REGION} \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || echo "")

BACKEND_TG_ARN=$(aws elbv2 describe-target-groups \
  --names bachelor-chatbot-backend-tg \
  --region ${AWS_REGION} \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || echo "")

if [ -z "$FRONTEND_TG_ARN" ] || [ "$FRONTEND_TG_ARN" = "None" ]; then
  echo "⚠ ターゲットグループが見つかりません。"
  echo "  先に ./scripts/setup-alb-routing.sh を実行してください。"
  exit 1
fi

# サービス状態を確認
SERVICE_STATUS=$(aws ecs describe-services \
  --cluster ${ECS_CLUSTER} \
  --services ${ECS_SERVICE} \
  --region ${AWS_REGION} \
  --query 'services[0].status' \
  --output text 2>/dev/null || echo "MISSING")

if [ "$SERVICE_STATUS" = "ACTIVE" ]; then
  # 既存サービスを更新（503防止: 新タスクが起動するまで古いタスクを維持）
  echo "既存のECSサービスを更新中..."
  aws ecs update-service \
    --cluster ${ECS_CLUSTER} \
    --service ${ECS_SERVICE} \
    --task-definition ${TASK_DEFINITION} \
    --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200" \
    --force-new-deployment \
    --region ${AWS_REGION} > /dev/null
  echo "✓ サービス更新開始"

elif [ "$SERVICE_STATUS" = "DRAINING" ]; then
  # サービスがDRAINING中の場合は完了を待つ
  echo "サービスがDRAINING中です。完了を待機中..."
  while true; do
    STATUS=$(aws ecs describe-services \
      --cluster ${ECS_CLUSTER} \
      --services ${ECS_SERVICE} \
      --region ${AWS_REGION} \
      --query 'services[0].status' \
      --output text 2>/dev/null || echo "INACTIVE")

    if [ "$STATUS" = "INACTIVE" ] || [ "$STATUS" = "MISSING" ]; then
      echo "✓ DRAINING完了"
      break
    fi
    echo "  状態: $STATUS (待機中...)"
    sleep 10
  done

  # 新しいサービスを作成
  echo "新しいサービスを作成中..."
  aws ecs create-service \
    --cluster ${ECS_CLUSTER} \
    --service-name ${ECS_SERVICE} \
    --task-definition ${TASK_DEFINITION} \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUP}],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=${FRONTEND_TG_ARN},containerName=frontend,containerPort=3000" "targetGroupArn=${BACKEND_TG_ARN},containerName=backend,containerPort=8000" \
    --region ${AWS_REGION} > /dev/null
  echo "✓ サービス作成完了"

else
  # サービスが存在しない場合は新規作成
  echo "新しいサービスを作成中..."
  aws ecs create-service \
    --cluster ${ECS_CLUSTER} \
    --service-name ${ECS_SERVICE} \
    --task-definition ${TASK_DEFINITION} \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUP}],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=${FRONTEND_TG_ARN},containerName=frontend,containerPort=3000" "targetGroupArn=${BACKEND_TG_ARN},containerName=backend,containerPort=8000" \
    --region ${AWS_REGION} > /dev/null
  echo "✓ サービス作成完了"
fi

echo ""
echo "=========================================="
echo "デプロイが開始されました！"
echo "=========================================="
echo ""
echo "デプロイ状況の確認:"
echo "  aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --region ${AWS_REGION} --query 'services[0].deployments'"
echo ""
echo "ログの確認:"
echo "  aws logs tail /ecs/bachelor-chatbot --follow"
echo ""
echo "アクセスURL:"
echo "  HTTPS: https://d2xoqu91pyhs8a.cloudfront.net"
echo "  ALB直接: http://bachelor-chatbot-alb-2043869810.ap-northeast-1.elb.amazonaws.com"
echo ""
echo "ログイン情報:"
echo "  メールアドレス: yuki.kato@xvolve.com"
echo "  パスワード: chatbot2026"
echo ""

# デプロイ状況を監視（--quick オプションでスキップ可能）
if [ "$SKIP_MONITORING" = true ]; then
  echo "✓ デプロイ開始完了（監視スキップ）"
  echo ""
  echo "状況確認コマンド:"
  echo "  aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --region ${AWS_REGION} --query 'services[0].deployments'"
  exit 0
fi

echo "デプロイ状況を監視中... (Ctrl+C で終了)"
echo ""

while true; do
  STATUS=$(aws ecs describe-services \
    --cluster ${ECS_CLUSTER} \
    --services ${ECS_SERVICE} \
    --region ${AWS_REGION} \
    --query 'services[0].deployments[0].rolloutState' \
    --output text 2>/dev/null || echo "UNKNOWN")

  RUNNING=$(aws ecs describe-services \
    --cluster ${ECS_CLUSTER} \
    --services ${ECS_SERVICE} \
    --region ${AWS_REGION} \
    --query 'services[0].runningCount' \
    --output text 2>/dev/null || echo "0")

  DESIRED=$(aws ecs describe-services \
    --cluster ${ECS_CLUSTER} \
    --services ${ECS_SERVICE} \
    --region ${AWS_REGION} \
    --query 'services[0].desiredCount' \
    --output text 2>/dev/null || echo "1")

  echo "状態: ${STATUS} | 実行中: ${RUNNING}/${DESIRED}"

  if [ "$STATUS" = "COMPLETED" ]; then
    echo ""
    echo "✓ デプロイ完了！"
    echo ""
    echo "アクセスURL: https://d2xoqu91pyhs8a.cloudfront.net"
    break
  fi

  if [ "$STATUS" = "FAILED" ]; then
    echo ""
    echo "✗ デプロイ失敗"
    echo "  ログを確認してください: aws logs tail /ecs/bachelor-chatbot --follow"
    exit 1
  fi

  sleep 10
done
