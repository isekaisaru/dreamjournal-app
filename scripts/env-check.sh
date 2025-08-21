#!/bin/bash
# 環境変数完全性チェッカー

echo "🔍 環境変数完全性チェック開始..."

# 必須環境変数リスト
REQUIRED_VARS=(
    "POSTGRES_USER"
    "POSTGRES_DB" 
    "POSTGRES_PASSWORD"
    "SECRET_KEY_BASE"
    "RAILS_MASTER_KEY"
    "OPENAI_API_KEY"
    "JWT_EXPIRATION_TIME"
)

# ルート .env ファイルチェック
if [ ! -f ".env" ]; then
    echo "❌ ルート .env ファイルが見つかりません"
    exit 1
fi

# backend/.env ファイルチェック  
if [ ! -f "backend/.env" ]; then
    echo "❌ backend/.env ファイルが見つかりません"
    exit 1
fi

# 必須変数チェック
missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "❌ 不足している環境変数:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    exit 1
fi

echo "✅ 全ての必須環境変数が設定されています"

# Docker Compose 設定チェック
if docker-compose config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml 設定は正常です"
else
    echo "❌ docker-compose.yml 設定にエラーがあります"
    exit 1
fi

echo "🎉 環境変数完全性チェック完了 - 全て正常です！"