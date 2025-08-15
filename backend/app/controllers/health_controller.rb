# ========================================
# 🩺 ヘルスチェックコントローラー
# ========================================
# 
# 役割と利用シーン：
# - Docker HEALTHCHECK での利用
# - 本番環境でのロードバランサー監視
# - 監視ツール（Prometheus、Datadog等）での死活監視
# - CI/CDパイプラインでのデプロイ後検証
# - 開発中のコンテナ起動状態確認

class HealthController < ApplicationController
  # 認証をスキップ（外部監視ツールからのアクセスを許可）
  skip_before_action :authenticate_request, only: [:check, :detailed_check]
  
  # ========================================
  # 🔍 基本的なヘルスチェック
  # ========================================
  # 
  # 何をチェックするか：
  # - Webサーバー（Puma）の応答性
  # - Railsアプリケーションの基本動作
  # - 軽量・高速応答でリソース消費を最小化
  
  def check
    render json: { 
      status: 'OK', 
      timestamp: Time.current,
      version: Rails.version,
      environment: Rails.env
    }, status: :ok
  end

  # ========================================
  # 🔍 詳細ヘルスチェック（オプション）
  # ========================================
  # 
  # 本番運用時の詳細診断用
  # 高負荷時は使用を控える
  
  def detailed_check
    health_status = {
      status: 'OK',
      timestamp: Time.current,
      checks: {}
    }
    
    all_ok = true

    # データベース接続チェック
    db_status = check_database
    health_status[:checks][:database] = db_status
    all_ok = false if db_status[:status] != 'OK'
      
    # Redisチェック（将来的に使用する場合）
    # redis_status = check_redis
    # health_status[:checks][:redis] = redis_status
    # all_ok = false if redis_status[:status] != 'OK'
      
    # 外部API接続チェック（OpenAI等、将来的に）
    # external_apis_status = check_external_apis
    # health_status[:checks][:external_apis] = external_apis_status
    # all_ok = false if external_apis_status[:status] != 'OK'
      
    health_status[:status] = 'ERROR' unless all_ok
    
    render json: health_status, status: all_ok ? :ok : :service_unavailable
  end

  private

  # ========================================
  # 🗄️ データベース接続確認
  # ========================================
  def check_database
    start_time = Time.current
    ActiveRecord::Base.connection.execute("SELECT 1")
    {
      status: 'OK',
      response_time_ms: ((Time.current - start_time) * 1000).round(2)
    }
  rescue StandardError => e
    {
      status: 'ERROR',
      message: e.message
    }
  end
  
  # ========================================
  # 📊 将来的な拡張例
  # ========================================
  # 
  # def check_redis
  #   start_time = Time.current
  #   Redis.current.ping
  #   {
  #     status: 'OK',
  #     response_time_ms: ((Time.current - start_time) * 1000).round(2)
  #   }
  # rescue StandardError => e
  #   {
  #     status: 'ERROR',
  #     message: e.message
  #   }
  # end
  
  # def check_external_apis
  #   # ...
  # end
end