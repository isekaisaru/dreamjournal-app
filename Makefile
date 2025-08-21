# ========================================
# 🛠️ 夢ログ 開発ワークフロー Makefile
# ========================================
# 
# 使用方法:
#   make dev-up     # 開発環境起動
#   make prod-up    # 本番環境起動
#   make logs       # ログ確認
#   make clean      # クリーンアップ

.PHONY: help dev-up dev-down prod-up prod-down logs clean test build

# デフォルトターゲット
help: ## 📋 利用可能なコマンドを表示
	@echo "🛠️  夢ログ Docker 管理コマンド"
	@echo "================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# =========================
# 🛠️ 開発環境コマンド
# =========================

dev-up: ## 🚀 開発環境を起動
	@echo "🚀 開発環境起動中..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "✅ 開発環境起動完了"
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "⚡ Backend:  http://localhost:3001"

dev-down: ## ⏹️ 開発環境を停止
	@echo "⏹️ 開発環境停止中..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
	@echo "✅ 開発環境停止完了"

dev-restart: ## 🔄 開発環境を再起動
	@echo "🔄 開発環境再起動中..."
	make dev-down
	make dev-up

dev-logs: ## 📊 開発環境のログを表示
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

dev-shell-backend: ## 🐚 バックエンドコンテナにシェル接続
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend bash

dev-shell-frontend: ## 🐚 フロントエンドコンテナにシェル接続
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec frontend sh

dev-rails-console: ## 💎 Rails コンソールを起動
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend bundle exec rails console

# =========================
# 🚀 本番環境コマンド
# =========================

prod-up: ## 🚀 本番環境を起動
	@echo "🚀 本番環境起動中..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "✅ 本番環境起動完了"

prod-down: ## ⏹️ 本番環境を停止
	@echo "⏹️ 本番環境停止中..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
	@echo "✅ 本番環境停止完了"

prod-logs: ## 📊 本番環境のログを表示
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# =========================
# 🔧 ビルド・テストコマンド
# =========================

build: ## 🔨 全サービスをビルド
	@echo "🔨 全サービスビルド中..."
	docker-compose build --parallel
	@echo "✅ ビルド完了"

build-no-cache: ## 🔨 キャッシュなしでビルド
	@echo "🔨 クリーンビルド中..."
	docker-compose build --no-cache --parallel
	@echo "✅ クリーンビルド完了"

test: ## 🧪 テストを実行
	@echo "🧪 テスト実行中..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend bundle exec rails test
	@echo "✅ テスト完了"

# =========================
# 🗄️ データベースコマンド
# =========================

db-setup: ## 🗄️ データベースセットアップ
	@echo "🗄️ データベースセットアップ中..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend bundle exec rails db:setup
	@echo "✅ データベースセットアップ完了"

db-migrate: ## 🗄️ データベースマイグレーション
	@echo "🗄️ マイグレーション実行中..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend bundle exec rails db:migrate
	@echo "✅ マイグレーション完了"

db-seed: ## 🌱 シードデータ投入
	@echo "🌱 シードデータ投入中..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend bundle exec rails db:seed
	@echo "✅ シードデータ投入完了"

db-reset: ## 🔄 データベースリセット
	@echo "🔄 データベースリセット中..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend bundle exec rails db:reset
	@echo "✅ データベースリセット完了"

# =========================
# 🧹 クリーンアップコマンド
# =========================

clean: ## 🧹 未使用リソースをクリーンアップ
	@echo "🧹 クリーンアップ中..."
	docker system prune -f
	docker volume prune -f
	@echo "✅ クリーンアップ完了"

clean-all: ## 🧹 全Docker リソースをクリーンアップ（危険）
	@echo "⚠️  全Dockerリソースを削除中..."
	@read -p "本当に削除しますか？ (y/N): " confirm && [ "$$confirm" = "y" ]
	docker system prune -a -f --volumes
	@echo "✅ 全リソース削除完了"

# =========================
# 📊 監視・診断コマンド
# =========================

status: ## 📊 コンテナ状態を確認
	@echo "📊 コンテナ状態:"
	docker-compose ps

health: ## 🩺 ヘルスチェック状態を確認
	@echo "🩺 ヘルスチェック状態:"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend curl -f http://localhost:3001/health
	@echo ""
	curl -f http://localhost:3000 > /dev/null 2>&1 && echo "✅ Frontend: OK" || echo "❌ Frontend: NG"

health-detailed: ## 🔍 詳細ヘルスチェック実行
	@echo "🔍 詳細ヘルスチェック実行中..."
	curl -s http://localhost:3001/health/detailed | jq . || echo "❌ 詳細ヘルスチェック失敗"

monitor: ## 📊 総合システム監視実行
	@echo "📊 総合システム監視開始..."
	./scripts/monitor.sh

monitor-watch: ## 👁️ リアルタイム監視開始
	@echo "👁️ リアルタイム監視開始（Ctrl+Cで停止）..."
	watch -n 5 './scripts/monitor.sh containers && ./scripts/monitor.sh api'

logs: ## 📊 全サービスのログを表示
	docker-compose logs -f

logs-errors: ## 🚨 エラーログのみ表示
	@echo "🚨 最新エラーログ:"
	docker-compose logs --since=1h | grep -i error || echo "エラーログなし"

# =========================
# 🔒 セキュリティコマンド
# =========================

security-scan: ## 🔍 セキュリティスキャン実行
	@echo "🔍 セキュリティスキャン中..."
	@echo "Backend 脆弱性チェック:"
	cd backend && bundle audit check
	@echo "Frontend 脆弱性チェック:"
	cd frontend && yarn audit

env-check: ## 🔒 環境変数設定チェック
	@echo "🔒 環境変数設定チェック:"
	@echo "Backend .env 存在確認:"
	@test -f backend/.env && echo "✅ backend/.env 存在" || echo "❌ backend/.env 不在"
	@echo "Frontend .env.local 存在確認:"
	@test -f frontend/.env.local && echo "✅ frontend/.env.local 存在" || echo "⚠️  frontend/.env.local 不在（任意）"