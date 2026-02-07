#!/bin/bash
# ECSデプロイ高速化設定スクリプト

AWS_REGION="ap-northeast-1"

echo "=== ECSデプロイ高速化設定 ==="
echo ""

# ターゲットグループARN取得
FRONTEND_TG=$(aws elbv2 describe-target-groups --names bachelor-chatbot-frontend-tg --region ${AWS_REGION} --query 'TargetGroups[0].TargetGroupArn' --output text)
BACKEND_TG=$(aws elbv2 describe-target-groups --names bachelor-chatbot-backend-tg --region ${AWS_REGION} --query 'TargetGroups[0].TargetGroupArn' --output text)

# 1. Deregistration delay を 30秒に短縮（デフォルト300秒）
echo "[1/3] Deregistration delay を 30秒に短縮..."
aws elbv2 modify-target-group-attributes \
  --target-group-arn ${FRONTEND_TG} \
  --attributes Key=deregistration_delay.timeout_seconds,Value=30 \
  --region ${AWS_REGION} > /dev/null

aws elbv2 modify-target-group-attributes \
  --target-group-arn ${BACKEND_TG} \
  --attributes Key=deregistration_delay.timeout_seconds,Value=30 \
  --region ${AWS_REGION} > /dev/null
echo "✓ 完了"

# 2. ヘルスチェック間隔を短縮
echo "[2/3] ヘルスチェック設定を最適化..."
aws elbv2 modify-target-group \
  --target-group-arn ${FRONTEND_TG} \
  --health-check-interval-seconds 5 \
  --health-check-timeout-seconds 3 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 2 \
  --region ${AWS_REGION} > /dev/null

aws elbv2 modify-target-group \
  --target-group-arn ${BACKEND_TG} \
  --health-check-interval-seconds 5 \
  --health-check-timeout-seconds 3 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 2 \
  --region ${AWS_REGION} > /dev/null
echo "✓ 完了"

# 3. ECSサービスの設定確認
echo "[3/3] 設定確認..."
echo ""
echo "Frontend TG:"
aws elbv2 describe-target-group-attributes --target-group-arn ${FRONTEND_TG} --region ${AWS_REGION} --query 'Attributes[?Key==`deregistration_delay.timeout_seconds`].Value' --output text | xargs -I{} echo "  deregistration_delay: {}秒"
aws elbv2 describe-target-groups --target-group-arns ${FRONTEND_TG} --region ${AWS_REGION} --query 'TargetGroups[0].HealthCheckIntervalSeconds' --output text | xargs -I{} echo "  health_check_interval: {}秒"

echo ""
echo "=== 最適化完了 ==="
echo ""
echo "期待される改善:"
echo "  - Deregistration: 300秒 → 30秒 (4.5分短縮)"
echo "  - ヘルスチェック: 30秒×2 → 5秒×2 (50秒短縮)"
echo "  - 合計: 約5分短縮"
