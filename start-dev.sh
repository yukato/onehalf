#!/bin/bash

# ローカル開発環境起動スクリプト

cd "$(dirname "$0")"

# 既存プロセスを停止
echo "既存のプロセスを停止中..."
lsof -ti:8100 | xargs kill -9 2>/dev/null
lsof -ti:3100 | xargs kill -9 2>/dev/null
lsof -ti:5555 | xargs kill -9 2>/dev/null
sleep 1

# MySQL Dockerコンテナを起動（docker compose使用）
echo "MySQLコンテナを起動中..."
docker compose up mysql -d

# MySQLの起動を待機
echo "MySQLの起動を待機中..."
for i in {1..30}; do
  if docker compose exec mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
    echo "MySQLが起動しました"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "警告: MySQLの起動確認がタイムアウトしました"
  fi
  sleep 1
done

# バックエンド起動
echo "バックエンドを起動中..."
source venv/bin/activate
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8100 &
BACKEND_PID=$!
cd ..

# フロントエンド起動
echo "フロントエンドを起動中..."
cd frontend
npm run dev &
FRONTEND_PID=$!

# Prisma Studio起動
echo "Prisma Studioを起動中..."
npx prisma studio &
PRISMA_STUDIO_PID=$!
cd ..

echo ""
echo "================================"
echo "サービスが起動しました"
echo "================================"
echo "MySQL: localhost:3307 (Docker)"
echo "バックエンド: http://localhost:8100"
echo "フロントエンド: http://localhost:3100"
echo "Prisma Studio: http://localhost:5555"
echo ""
echo "アプリログイン:"
echo "  ユーザー名: bachelor"
echo "  パスワード: chatbot2026"
echo ""
echo "MySQL: localhost:3307 (Docker)"
echo ""
echo "停止するには Ctrl+C を押してください"
echo "(MySQLコンテナは停止されません。手動で停止: docker compose stop mysql)"
echo "================================"

# 終了シグナルをキャッチ
trap "echo '停止中...'; kill $BACKEND_PID $FRONTEND_PID $PRISMA_STUDIO_PID 2>/dev/null; exit" SIGINT SIGTERM

# プロセスを待機
wait
