#!/bin/bash
set -e

# ================================================
# Backup RDS Database
# ================================================

AWS_REGION="ap-northeast-1"
SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

# Parse DATABASE_URL: mysql://user:password@host:port/database
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|mysql://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^@]*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^:]*:[^@]*@[^:]*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^/]*/\(.*\)|\1|p')

echo "Database: $DB_NAME @ $DB_HOST:$DB_PORT"

# Create backup directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${PROJECT_ROOT}/data_backup_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

DUMP_FILE="${BACKUP_DIR}/${DB_NAME}_dump.sql"

echo ""
echo "Creating backup..."
echo "Output: $DUMP_FILE"
echo ""

mysqldump -h "$DB_HOST" \
    -P "$DB_PORT" \
    -u "$DB_USER" \
    --password="$DB_PASS" \
    --skip-lock-tables \
    --skip-add-locks \
    --no-tablespaces \
    "$DB_NAME" > "$DUMP_FILE" 2>&1

# Check file size
FILE_SIZE=$(ls -lh "$DUMP_FILE" | awk '{print $5}')
echo ""
echo "✅ Backup complete!"
echo "   File: $DUMP_FILE"
echo "   Size: $FILE_SIZE"
