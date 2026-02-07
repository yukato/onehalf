#!/bin/bash
#
# 日次データ更新スクリプト
# 使用方法:
#   ./scripts/daily_update.sh           # 差分更新（推奨）
#   ./scripts/daily_update.sh --full    # 全件更新
#

set -e  # エラー時に停止

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# 色付きログ出力
log_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[1;32m[OK]\033[0m $1"
}

log_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

# 開始時刻
START_TIME=$(date +%s)
log_info "=== RAGデータ日次更新 開始 $(date '+%Y-%m-%d %H:%M:%S') ==="

# 仮想環境の有効化
if [ -d "venv" ]; then
    source venv/bin/activate
    log_info "仮想環境を有効化しました"
else
    log_error "venv ディレクトリが見つかりません"
    exit 1
fi

# モード判定
if [ "$1" == "--full" ]; then
    MODE="full"
    log_info "モード: 全件更新"
else
    MODE="incremental"
    log_info "モード: 差分更新"
fi

echo ""

# 1. 記事データの更新
log_info "[1/6] 記事データを更新中..."
if [ "$MODE" == "incremental" ]; then
    python scripts/export_articles.py --incremental
else
    python scripts/export_articles.py
fi
log_success "記事データの更新完了"
echo ""

# 2. 記事Embeddingの計算
log_info "[2/6] 記事Embeddingを計算中..."
python scripts/precompute_embeddings.py
log_success "記事Embeddingの計算完了"
echo ""

# 3. チケットデータの更新
log_info "[3/6] チケットデータを更新中..."
if [ "$MODE" == "incremental" ]; then
    python scripts/fetch_solved_tickets.py --incremental
else
    python scripts/fetch_solved_tickets.py --months 6
fi
log_success "チケットデータの更新完了"
echo ""

# 4. チケットEmbeddingの計算
log_info "[4/6] チケットEmbeddingを計算中..."
python scripts/precompute_ticket_embeddings.py
log_success "チケットEmbeddingの計算完了"
echo ""

# 5. マクロデータの更新
log_info "[5/6] マクロデータを更新中..."
python scripts/fetch_zendesk_macros.py
log_success "マクロデータの更新完了"
echo ""

# 6. マクロEmbeddingの計算
log_info "[6/6] マクロEmbeddingを計算中..."
python scripts/precompute_macro_embeddings.py
log_success "マクロEmbeddingの計算完了"
echo ""

# 終了時刻と所要時間
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

log_info "=== 更新完了 $(date '+%Y-%m-%d %H:%M:%S') ==="
log_success "所要時間: ${MINUTES}分${SECONDS}秒"
