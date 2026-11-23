# ========================================
# 🐛 開発環境デバッグツール設定
# ========================================
# 
# 目的:
# - 開発効率の向上
# - パフォーマンス問題の早期発見
# - デバッグ情報の可視化
# - 開発中のリアルタイム監視

if Rails.env.development? || ENV['DEBUG_TOOLS'] == 'true'
  
  # ========================================
  # 🚀 パフォーマンス監視
  # ========================================
  
  # スロークエリの詳細監視
  ActiveSupport::Notifications.subscribe 'sql.active_record' do |name, started, finished, unique_id, data|
    duration_ms = (finished - started) * 1000
    
    # 50ms以上のクエリを警告
    if duration_ms > 50
      Rails.logger.warn "\n" + "="*80
      Rails.logger.warn "🐌 SLOW QUERY DETECTED (#{duration_ms.round(2)}ms)"
      Rails.logger.warn "="*80
      # 夢の検索語は SQL 文に埋め込まれるので、文字列の値は伏せる（structured_logging.rb と同じ）。
      # DEBUG_TOOLS=true なら本番でも動くため。
      sql = begin
        SentryEventScrubber.scrub_sql_strings(data[:sql].to_s)
      rescue StandardError
        SentryEventScrubber::REDACTED
      end
      Rails.logger.warn "SQL: #{sql}"
      Rails.logger.warn "Name: #{data[:name]}"
      Rails.logger.warn "Connection: #{data[:connection_id]}"
      Rails.logger.warn "="*80 + "\n"
    end
  end

  # コントローラーアクション実行時間の詳細表示
  ActiveSupport::Notifications.subscribe 'process_action.action_controller' do |name, started, finished, unique_id, data|
    duration_ms = (finished - started) * 1000
    
    # 1秒以上のアクションを警告
    if duration_ms > 1000
      Rails.logger.warn "\n" + "="*80
      Rails.logger.warn "🐌 SLOW CONTROLLER ACTION (#{duration_ms.round(2)}ms)"
      Rails.logger.warn "="*80
      Rails.logger.warn "Controller: #{data[:controller]}##{data[:action]}"
      Rails.logger.warn "Method: #{data[:method]}"
      Rails.logger.warn "Path: #{data[:path].to_s.split('?', 2).first}" # クエリ文字列（検索語など）は出さない
      Rails.logger.warn "Parameters: #{data[:params].except('controller', 'action')}"
      Rails.logger.warn "Status: #{data[:status]}"
      Rails.logger.warn "View Runtime: #{data[:view_runtime].round(2)}ms" if data[:view_runtime]
      Rails.logger.warn "DB Runtime: #{data[:db_runtime].round(2)}ms" if data[:db_runtime]
      Rails.logger.warn "="*80 + "\n"
    end
  end

  # ========================================
  # 🔍 デバッグ用ヘルパーメソッド
  # ========================================
  
  class DebugHelper
    # メモリ使用量をコンソールに表示
    def self.memory_usage(label = "Memory Usage")
      require 'get_process_mem'
      mem = GetProcessMem.new
      
      puts "\n" + "="*50
      puts "📊 #{label}"
      puts "="*50
      puts "RSS: #{mem.mb.round(2)} MB"
      puts "VSZ: #{mem.gb.round(3)} GB" if mem.respond_to?(:gb)
      puts "PID: #{Process.pid}"
      puts "GC Count: #{GC.count}"
      puts "GC Stat: #{GC.stat.slice(:heap_allocated_pages, :heap_live_slots, :heap_free_slots)}"
      puts "="*50 + "\n"
    rescue LoadError
      puts "📊 #{label}: get_process_mem gem not available"
    end

    # データベース接続プール状態を表示
    def self.connection_pool_status
      pool = ActiveRecord::Base.connection_pool
      
      puts "\n" + "="*50
      puts "🗄️ Database Connection Pool Status"
      puts "="*50
      puts "Size: #{pool.size}"
      puts "Checked out: #{pool.checked_out.length}"
      puts "Available: #{pool.available_connection_names.length}"
      puts "Current connections: #{pool.connections.size}"
      puts "="*50 + "\n"
    end

    # リクエストパフォーマンス計測
    def self.benchmark_request(description = "Request")
      start_time = Time.current
      result = yield
      end_time = Time.current
      duration_ms = ((end_time - start_time) * 1000).round(2)
      
      puts "\n" + "="*50
      puts "⏱️ #{description} Performance"
      puts "="*50
      puts "Duration: #{duration_ms}ms"
      puts "Start: #{start_time.strftime('%H:%M:%S.%L')}"
      puts "End: #{end_time.strftime('%H:%M:%S.%L')}"
      puts "="*50 + "\n"
      
      result
    end
  end

  # ========================================
  # 🎯 開発用 Rails コンソールヘルパー
  # ========================================
  
  # Rails コンソールで使用できるショートカットメソッド
  if defined?(Rails::Console)
    def mem
      DebugHelper.memory_usage
    end

    def pool
      DebugHelper.connection_pool_status
    end

    def benchmark(description = "Operation", &block)
      DebugHelper.benchmark_request(description, &block)
    end

    def health
      # 開発環境でのヘルスチェック実行
      puts "\n🩺 Running health checks..."
      
      begin
        # データベース接続テスト
        start_time = Time.current
        ActiveRecord::Base.connection.execute("SELECT 1")
        db_time = ((Time.current - start_time) * 1000).round(2)
        puts "✅ Database: OK (#{db_time}ms)"
        
        # テーブル確認
        User.count
        Dream.count
        puts "✅ Models: OK"
        
        # メモリ使用量
        DebugHelper.memory_usage("Health Check")
        
        puts "✅ Health check completed successfully!\n"
        
      rescue => e
        puts "❌ Health check failed: #{e.message}"
      end
    end
  end

  # ========================================
  # 🔧 開発中の便利機能
  # ========================================
  
  # リクエスト情報の詳細ログ
  if defined?(ActionController::Base)
    class ActionController::Base
      around_action :log_request_details, if: -> { Rails.env.development? && ENV['VERBOSE_LOGGING'] == 'true' }

      private

      def log_request_details
        start_time = Time.current
        
        Rails.logger.debug "\n" + "="*80
        Rails.logger.debug "🌐 REQUEST START"
        Rails.logger.debug "="*80
        Rails.logger.debug "Method: #{request.method}"
        Rails.logger.debug "Path: #{request.path}"
        Rails.logger.debug "Params: #{params.except('controller', 'action')}"
        Rails.logger.debug "Headers: #{request.headers.to_h.select { |k, v| k.start_with?('HTTP_') }}"
        Rails.logger.debug "User Agent: #{request.user_agent}"
        Rails.logger.debug "Remote IP: #{request.remote_ip}"
        Rails.logger.debug "="*80

        result = yield

        duration_ms = ((Time.current - start_time) * 1000).round(2)
        Rails.logger.debug "="*80
        Rails.logger.debug "🏁 REQUEST END (#{duration_ms}ms)"
        Rails.logger.debug "="*80 + "\n"

        result
      end
    end
  end

  Rails.logger.info "🐛 Debug tools loaded for #{Rails.env} environment"
  Rails.logger.info "💡 Available console commands: mem, pool, benchmark, health"
  Rails.logger.info "🔧 Set VERBOSE_LOGGING=true for detailed request logging"
end