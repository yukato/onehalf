#!/bin/bash

# ALB パスベースルーティング設定スクリプト
# フロントエンド(3000)とバックエンド(8000)を同じALBでルーティング
#
# Usage: ./scripts/setup-alb-routing.sh

set -e

# 設定（既存のリソースから取得）
AWS_REGION="ap-northeast-1"
VPC_ID="vpc-e6f8de81"
ALB_ARN="arn:aws:elasticloadbalancing:ap-northeast-1:140493024080:loadbalancer/app/bachelor-chatbot-alb/31b31f06a75b4210"
LISTENER_ARN="arn:aws:elasticloadbalancing:ap-northeast-1:140493024080:listener/app/bachelor-chatbot-alb/31b31f06a75b4210/12a2f33f61a2fbab"

echo "=========================================="
echo "ALB パスベースルーティング設定"
echo "=========================================="
echo ""

# 1. フロントエンド用ターゲットグループを作成
echo "[1/4] フロントエンド用ターゲットグループを作成中..."
FRONTEND_TG_ARN=$(aws elbv2 create-target-group \
  --name bachelor-chatbot-frontend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id ${VPC_ID} \
  --target-type ip \
  --health-check-path "/" \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region ${AWS_REGION} \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null) || {
    # 既に存在する場合は取得
    FRONTEND_TG_ARN=$(aws elbv2 describe-target-groups \
      --names bachelor-chatbot-frontend-tg \
      --region ${AWS_REGION} \
      --query 'TargetGroups[0].TargetGroupArn' \
      --output text)
    echo "✓ フロントエンドTG既存: ${FRONTEND_TG_ARN}"
  }
[ -n "$FRONTEND_TG_ARN" ] && echo "✓ フロントエンドTG: ${FRONTEND_TG_ARN}"
echo ""

# 2. バックエンド用ターゲットグループを作成
echo "[2/4] バックエンド用ターゲットグループを作成中..."
BACKEND_TG_ARN=$(aws elbv2 create-target-group \
  --name bachelor-chatbot-backend-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id ${VPC_ID} \
  --target-type ip \
  --health-check-path "/health" \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region ${AWS_REGION} \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null) || {
    # 既に存在する場合は取得
    BACKEND_TG_ARN=$(aws elbv2 describe-target-groups \
      --names bachelor-chatbot-backend-tg \
      --region ${AWS_REGION} \
      --query 'TargetGroups[0].TargetGroupArn' \
      --output text)
    echo "✓ バックエンドTG既存: ${BACKEND_TG_ARN}"
  }
[ -n "$BACKEND_TG_ARN" ] && echo "✓ バックエンドTG: ${BACKEND_TG_ARN}"
echo ""

# 3. 既存のルールを確認
echo "[3/4] リスナールールを設定中..."
EXISTING_RULE=$(aws elbv2 describe-rules \
  --listener-arn ${LISTENER_ARN} \
  --region ${AWS_REGION} \
  --query "Rules[?Conditions[?Values[0]=='/api/*']].RuleArn" \
  --output text)

# /api/black/* → フロントエンド (Next.js API Routes)
EXISTING_BLACK_RULE=$(aws elbv2 describe-rules \
  --listener-arn ${LISTENER_ARN} \
  --region ${AWS_REGION} \
  --query "Rules[?Conditions[?Values[0]=='/api/black/*']].RuleArn" \
  --output text)

if [ -z "$EXISTING_BLACK_RULE" ] || [ "$EXISTING_BLACK_RULE" = "None" ]; then
  aws elbv2 create-rule \
    --listener-arn ${LISTENER_ARN} \
    --priority 5 \
    --conditions Field=path-pattern,Values='/api/black/*' \
    --actions Type=forward,TargetGroupArn=${FRONTEND_TG_ARN} \
    --region ${AWS_REGION} > /dev/null
  echo "✓ /api/black/* → フロントエンド ルール作成"
else
  echo "✓ /api/black/* ルール既存"
fi

# /api/* → バックエンド (FastAPI)
if [ -z "$EXISTING_RULE" ] || [ "$EXISTING_RULE" = "None" ]; then
  aws elbv2 create-rule \
    --listener-arn ${LISTENER_ARN} \
    --priority 10 \
    --conditions Field=path-pattern,Values='/api/*' \
    --actions Type=forward,TargetGroupArn=${BACKEND_TG_ARN} \
    --region ${AWS_REGION} > /dev/null
  echo "✓ /api/* → バックエンド ルール作成"
else
  echo "✓ /api/* ルール既存"
fi
echo ""

# 4. デフォルトアクションをフロントエンドに変更
echo "[4/4] デフォルトルートをフロントエンドに設定中..."
aws elbv2 modify-listener \
  --listener-arn ${LISTENER_ARN} \
  --default-actions Type=forward,TargetGroupArn=${FRONTEND_TG_ARN} \
  --region ${AWS_REGION} > /dev/null
echo "✓ デフォルト → フロントエンド 設定完了"
echo ""

# 結果を環境変数ファイルに保存
cat > /tmp/alb-config.env << EOF
FRONTEND_TG_ARN=${FRONTEND_TG_ARN}
BACKEND_TG_ARN=${BACKEND_TG_ARN}
EOF

echo "=========================================="
echo "ALBルーティング設定完了！"
echo "=========================================="
echo ""
echo "ターゲットグループARN:"
echo "  フロントエンド: ${FRONTEND_TG_ARN}"
echo "  バックエンド: ${BACKEND_TG_ARN}"
echo ""
echo "ルーティング:"
echo "  /api/admin/* → フロントエンド (port 3000) - 認証API"
echo "  /api/black/* → フロントエンド (port 3000) - 管理画面API"
echo "  /api/*       → バックエンド (port 8000) - チャットAPI"
echo "  /*           → フロントエンド (port 3000) - 画面表示"
echo ""
echo "設定は /tmp/alb-config.env に保存されました"
