#!/bin/bash
set -e

# ================================================
# Run Prisma Migrations against RDS
# ================================================

AWS_REGION="ap-northeast-1"

echo "Fetching DATABASE_URL from Secrets Manager..."

DATABASE_URL=$(aws secretsmanager get-secret-value \
    --secret-id "bachelor-chatbot/database-url" \
    --query 'SecretString' \
    --output text \
    --region ${AWS_REGION})

if [ "$DATABASE_URL" == "placeholder" ] || [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is not set. Please run setup-rds.sh first."
    exit 1
fi

echo "DATABASE_URL retrieved successfully"
echo ""

# Change to frontend directory
cd "$(dirname "$0")/../frontend"

echo "Running Prisma db push..."
DATABASE_URL="$DATABASE_URL" npx prisma db push

echo ""
echo "Running Prisma seed..."
DATABASE_URL="$DATABASE_URL" npx prisma db seed

echo ""
echo "Generating Prisma client..."
DATABASE_URL="$DATABASE_URL" npx prisma generate

echo ""
echo "✅ Migrations complete!"
