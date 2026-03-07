# ========================================
# 🩺 ヘルスチェックコントローラー
# ========================================

require 'net/http'
require 'uri'
# 
# 役割と利用シーン：
# - Docker HEALTHCHECK での利用
# - 本番環境でのロードバランサー監視
# - 監視ツール（Prometheus、Datadog等）での死活監視
# - CI/CDパイプラインでのデプロイ後検証
# - 開発中のコンテナ起動状態確認

class HealthController < ApplicationController
  # 認証をスキップ（外部監視ツールからのアクセスを許可）
  skip_before_action :authorize_request, only: [:check, :detailed_check, :live, :ready], raise: false
  
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

  # Liveness: アプリのプロセスが生きているかのみ確認（DB未確認）
  def live
    render json: {
      status: 'ok',
      timestamp: Time.current
    }, status: :ok
  end

  # Readiness: DB接続まで含めた準備完了状態を確認
  def ready
    ApplicationRecord.connection.execute('SELECT 1')
    render json: {
      status: 'ok',
      db: 'connected',
      timestamp: Time.current
    }, status: :ok
  rescue => e
    render json: {
      status: 'error',
      db: 'disconnected',
      message: e.message
    }, status: :service_unavailable
  end

  # ========================================
  # 🔍 詳細ヘルスチェック（オプション）
  # ========================================
  # 
  # 本番運用時の詳細診断用
  # 高負荷時は使用を控える
  
  def detailed_check
    start_time = Time.current
    
    health_status = {
      timestamp: start_time.iso8601,
      status: "healthy",
      version: {
        app: ENV['APP_VERSION'] || '1.0.0',
        rails: Rails.version,
        ruby: RUBY_VERSION
      },
      environment: Rails.env,
      checks: {}
    }

    # 🗄️ データベース接続チェック
    health_status[:checks][:database] = check_database_enhanced

    # 🔗 外部API接続チェック（OpenAI）
    health_status[:checks][:external_apis] = check_external_apis

    # 💾 メモリ使用量チェック
    health_status[:checks][:memory] = check_memory_usage

    # 📊 応答時間計測
    health_status[:response_time_ms] = ((Time.current - start_time) * 1000).round(2)

    # 🚨 全体ステータス判定
    failed_checks = health_status[:checks].select { |_, check| check[:status] != "healthy" }
    
    if failed_checks.any?
      health_status[:status] = failed_checks.values.any? { |check| check[:status] == "critical" } ? "critical" : "degraded"
      status_code = health_status[:status] == "critical" ? 503 : 200
    else
      status_code = 200
    end

    render json: health_status, status: status_code
  rescue => e
    # 🚨 予期しないエラー
    Rails.logger.error "Health check failed: #{e.message}"
    render json: {
      timestamp: Time.current.iso8601,
      status: "critical",
      error: e.message,
      version: {
        app: ENV['APP_VERSION'] || '1.0.0',
        rails: Rails.version,
        ruby: RUBY_VERSION
      }
    }, status: 503
  end

  private

  # ========================================
  # 🗄️ 拡張データベース接続確認
  # ========================================
  def check_database_enhanced
    start_time = Time.current
    
    begin
      # 単純な接続テスト
      ActiveRecord::Base.connection.execute("SELECT 1")
      
      # テーブル存在確認
      User.count
      Dream.count
      
      response_time = ((Time.current - start_time) * 1000).round(2)
      
      {
        status: "healthy",
        response_time_ms: response_time,
        connection_pool: {
          size: ActiveRecord::Base.connection_pool.size,
          checked_out: ActiveRecord::Base.connection_pool.checked_out.length,
          available: ActiveRecord::Base.connection_pool.available_connection_names.length
        }
      }
    rescue => e
      {
        status: "critical",
        error: e.message,
        response_time_ms: ((Time.current - start_time) * 1000).round(2)
      }
    end
  end

  # ========================================
  # 🔗 外部API接続確認
  # ========================================
  def check_external_apis
    apis = {}
    
    # OpenAI API確認
    if ENV['OPENAI_API_KEY'].present?
      start_time = Time.current
      begin
        # 軽量なAPIコール（モデル一覧取得）
        uri = URI('https://api.openai.com/v1/models')
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.read_timeout = 5
        
        request = Net::HTTP::Get.new(uri)
        request['Authorization'] = "Bearer #{ENV['OPENAI_API_KEY']}"
        
        response = http.request(request)
        response_time = ((Time.current - start_time) * 1000).round(2)
        
        if response.code == '200'
          apis[:openai] = {
            status: "healthy",
            response_time_ms: response_time
          }
        else
          apis[:openai] = {
            status: "degraded",
            error: "HTTP #{response.code}",
            response_time_ms: response_time
          }
        end
      rescue => e
        apis[:openai] = {
          status: "degraded",
          error: e.message,
          response_time_ms: ((Time.current - start_time) * 1000).round(2)
        }
      end
    else
      apis[:openai] = {
        status: "not_configured",
        message: "OPENAI_API_KEY not set"
      }
    end

    apis
  end

  # ========================================
  # 💾 メモリ使用量確認
  # ========================================
  def check_memory_usage
    begin
      # プロセスメモリ情報取得
      pid = Process.pid
      memory_info = `ps -o pid,rss,vsz -p #{pid}`.lines[1].split rescue nil
      
      if memory_info
        rss_kb = memory_info[1].to_i  # Resident Set Size (実メモリ)
        vsz_kb = memory_info[2].to_i  # Virtual Size (仮想メモリ)
        
        {
          status: "healthy",
          pid: pid,
          rss_mb: (rss_kb / 1024.0).round(2),
          vsz_mb: (vsz_kb / 1024.0).round(2),
          gc_stats: GC.stat.slice(:count, :heap_allocated_pages, :heap_live_slots, :heap_free_slots)
        }
      else
        {
          status: "unknown",
          message: "Could not retrieve memory information"
        }
      end
    rescue => e
      {
        status: "error",
        error: e.message
      }
    end
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
