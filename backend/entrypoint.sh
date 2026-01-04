#!/bin/bash
set -e

# ========================================
# 🏰 夢ログ バックエンド開店準備マニュアル
# ========================================
# 
# なぜ entrypoint.sh が必要か？
# - Dockerコンテナ起動時の複雑な初期化処理を整理
# - 従来の長いdocker-compose commandを分離して保守性向上
# - エラーハンドリングとログ出力の統一
# - 開発/本番環境での起動プロセスの標準化

echo "🌟 夢ログ バックエンド起動開始... ($(date))"
start_time=$(date +%s)

# ========================================
# 🧹 事前準備: 古いプロセスファイルの削除
# ========================================
# 
# なぜ必要か？
# - 前回の異常終了時にPIDファイルが残ってしまう場合がある
# - "A server is already running" エラーを防ぐため
# - Dockerコンテナの再起動時に確実にクリーンスタート

echo "🧹 古いサーバーファイルをお掃除中..."
rm -f /app/tmp/pids/server.pid
echo "✅ PIDファイル削除完了"

# ========================================
# 🔑 環境変数チェック: 必須変数の確認
# ========================================
#
# なぜ必要か？
# - 起動に必要な情報が欠けていると、後続の処理で予期せぬエラーが発生する
# - 早期に問題を検知し、分かりやすいエラーメッセージで開発者を助ける

echo "🔑 必須の環境変数を確認中..."
# Render環境ではDATABASE_URLを使用するため、POSTGRES_PASSWORDチェックを条件分岐
if [ -n "$DATABASE_URL" ]; then
    echo "✅ DATABASE_URLを検出 - Render環境として起動します"
else
    # ローカルDocker環境向けのチェック
    [ -z "$POSTGRES_PASSWORD" ] && { echo "❌ エラー: POSTGRES_PASSWORDが設定されていません。"; exit 1; }
    export POSTGRES_USER="${POSTGRES_USER:-postgres}"
    export POSTGRES_DB="${POSTGRES_DB:-dream_journal_development}"
    echo "✅ 必須の環境変数OK (User: $POSTGRES_USER, DB: $POSTGRES_DB)"
fi

# ========================================
# 📦 依存関係チェック: Gemの確認とインストール
# ========================================
# 
# なぜ bundle check が重要か？
# - Gemfile.lockと実際にインストールされたgemの整合性確認
# - 開発中にGemfileが変更された場合の自動対応
# - Dockerボリュームマウントでの依存関係ズレを防止

echo "📦 Gem依存関係チェック中..."
if bundle check; then
    echo "✅ Gem依存関係OK - 全て最新状態です"
else
    echo "⚠️  依存関係に変更を検出 - bundle installを実行中..."
    bundle install
    echo "✅ 依存関係更新完了"
fi

# ========================================
# 🕒 データベース接続待機
# ========================================
# 
# なぜ待機が必要か？
# - PostgreSQLコンテナの起動にはRailsより時間がかかる
# - depends_onは起動開始を待つだけで、実際の接続準備完了は別
# - 接続エラーでの起動失敗を防ぐためのリトライ機構

echo "🔌 データベース接続待機中..."
echo "🔌 データベース接続待機中..."
# Render Free Tier対策: DATABASE_URLがあっても必ず接続確認を行う
# 特にコールドスタート時はDB接続確立まで時間がかかるため(最大3分待機)
max_attempts=90
attempt=1

while [ $attempt -le $max_attempts ]; do
    if [ -n "$DATABASE_URL" ]; then
        # pg_isready は接続文字列を受け取れる
        # 失敗時の理由を知るために stderr を表示する
        if pg_isready -d "$DATABASE_URL"; then
             echo "✅ データベース接続成功 (${attempt}回目の試行)"
             break
        else
             echo "⚠️  接続トライ ${attempt}: pg_isready が失敗しました"
        fi
    else
        # ローカルDocker環境向け
        if PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" >/dev/null 2>&1; then
            echo "✅ データベース接続成功 (${attempt}回目の試行)"
            break
        fi
    fi
    
    echo "⏳ データベース接続待機... (${attempt}/${max_attempts})"
    sleep 2 
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ データベース接続タイムアウト - 接続できませんでした"
    exit 1
fi

# ========================================
# 🗄️ データベース準備: スマートセットアップ
# ========================================
# 
# db:prepare の利点：
# - 存在しないDBは作成、存在するDBはマイグレーション実行
# - db:create + db:migrate の合体技で冪等性を保証
# - 初回起動でも再起動でも同じコマンドで対応可能

echo "🗄️ データベース準備中..."
# 本番環境(Render)では Pre-Deploy Command でマイグレーションを行うため、
# 基本はスキップするが、Freeプラン対策として RUN_MIGRATIONS=true の場合のみ実行する
if [ "$RAILS_ENV" = "development" ]; then
    if bundle exec rails db:prepare; then
        echo "✅ [開発環境] データベース準備完了"
    else
        echo "❌ [開発環境] データベース準備エラー"
        exit 1
    fi
else
    if [ "$RUN_MIGRATIONS" = "true" ]; then
        echo "🔄 [本番環境] RUN_MIGRATIONS=true を検出 - マイグレーションを実行します..."
        if bundle exec rails db:migrate; then
            echo "✅ [本番環境] マイグレーション完了"
        else
            echo "❌ [本番環境] マイグレーション失敗"
            exit 1
        fi
    else
        echo "ℹ️  [本番環境] 自動マイグレーションをスキップします (RUN_MIGRATIONS != true)"
    fi
fi

# ========================================
# 🌱 開発環境での初期データ投入
# ========================================
# 
# シード実行の判定理由：
# - 本番環境では既存データ保護のためスキップ
# - 開発環境では一貫したテストデータで作業効率向上
# - OR 条件でシードエラーを無視（既にデータが存在する場合）

if [ "$RAILS_ENV" != "production" ]; then
    if [ "$RAILS_ENV" = "development" ]; then
        echo "🌱 開発環境の初期データ投入中..."
        bundle exec rails db:seed || echo "ℹ️  シードデータは既に存在しています"
        echo "✅ 初期データ準備完了"
    fi
fi

# ========================================
# 🎯 起動時間計測とログ出力
# ========================================

end_time=$(date +%s)
duration=$((end_time - start_time))
echo "⚡ 初期化完了！ 所要時間: ${duration}秒"
echo "✨ 準備完了！Railsサーバーを起動します..."
echo "🚀 コマンド実行: $*"

# ========================================
# 🚀 メインプロセス起動
# ========================================
# 
# exec "$@" の意味：
# - シェルプロセスを引数のコマンドで置き換え
# - Dockerの シグナル処理が正常に動作
# - PID 1でRailsが動作してgraceful shutdownが可能

exec bundle exec "$@"