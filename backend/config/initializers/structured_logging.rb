# ========================================
# 📊 構造化ログ設定
# ========================================
# 
# 目的:
# - JSON形式での統一的なログ出力
# - 監視ツール（ELK Stack, Splunk等）との連携
# - ログ分析・アラート設定の簡素化
# - パフォーマンス監視とデバッグ情報の提供

if Rails.env.production? || ENV['STRUCTURED_LOGGING'] == 'true'
  require 'logger'
  require 'json'

  # ========================================
  # 🔧 JSON フォーマッター
  # ========================================
  class JsonFormatter < Logger::Formatter
    def call(severity, datetime, progname, message)
      log_entry = {
        timestamp: datetime.iso8601,
        level: severity,
        pid: Process.pid,
        environment: Rails.env,
        application: 'dream-journal-backend',
        version: ENV['APP_VERSION'] || '1.0.0'
      }

      # メッセージの型に応じて処理
      case message
      when Hash
        log_entry.merge!(message)
      when String
        log_entry[:message] = message
      else
        log_entry[:message] = message.to_s
      end

      # プログラム名があれば追加
      log_entry[:component] = progname if progname

      "#{JSON.generate(log_entry)}\n"
    end
  end

  # ========================================
  # 🚀 Rails ログ設定
  # ========================================
  # Logger.new の既定レベルは DEBUG なので、production.rb の config.log_level
  # （RAILS_LOG_LEVEL、既定 info）を必ず渡す。渡していなかったため、本番は
  # RAILS_LOG_LEVEL=info でも DEBUG で動き、SQL の本文とバインド値がログに出ていた（2026-11-22）。
  Rails.logger = Logger.new(STDOUT, level: Rails.application.config.log_level)
  Rails.logger.formatter = JsonFormatter.new

  # ========================================
  # 📊 アプリケーション監視用ログヘルパー
  # ========================================
  class StructuredLogger
    def self.performance(operation:, duration_ms:, **additional_fields)
      Rails.logger.info({
        event_type: 'performance',
        operation: operation,
        duration_ms: duration_ms.round(2),
        **additional_fields
      })
    end

    def self.business_event(event:, user_id: nil, **additional_fields)
      Rails.logger.info({
        event_type: 'business',
        event: event,
        user_id: user_id,
        **additional_fields
      })
    end

    def self.security_event(event:, user_id: nil, ip_address: nil, **additional_fields)
      Rails.logger.warn({
        event_type: 'security',
        event: event,
        user_id: user_id,
        ip_address: ip_address,
        **additional_fields
      })
    end

    def self.error_event(error:, context: {})
      Rails.logger.error({
        event_type: 'error',
        error_class: error.class.name,
        error_message: error.message,
        error_backtrace: error.backtrace&.first(10),
        context: context
      })
    end

    # SQL の本文から文字列の値を '[FILTERED]' に置き換えてから出す。
    # DreamFilterQuery は夢の検索語を `where("title ILIKE :query", query: ...)` で SQL 文に
    # 直接埋め込むので、そのまま出すと検索語がログに残る（2026-11-23）。
    # 置き換えは Sentry に送る SQL と同じ処理（lib/sentry_event_scrubber.rb）を使う。
    # 置き換えに失敗したときは、値を出さないよう SQL ごと伏せる（ログのせいでクエリを失敗させない）。
    def self.loggable_sql(sql)
      return sql unless sql.is_a?(String)

      SentryEventScrubber.scrub_sql_strings(sql)
    rescue StandardError
      SentryEventScrubber::REDACTED
    end

    def self.health_check(status:, checks: {}, response_time_ms: nil)
      Rails.logger.info({
        event_type: 'health_check',
        status: status,
        checks: checks,
        response_time_ms: response_time_ms
      })
    end
  end

  # ========================================
  # 🔍 パフォーマンス監視
  # ========================================
  # コントローラーアクション実行時間をログ出力
  ActiveSupport::Notifications.subscribe 'process_action.action_controller' do |name, started, finished, unique_id, data|
    duration_ms = (finished - started) * 1000

    StructuredLogger.performance(
      operation: 'controller_action',
      duration_ms: duration_ms,
      controller: data[:controller],
      action: data[:action],
      method: data[:method],
      # クエリ文字列（夢の検索語 ?query=... など）は出さない。filtered_path でも伏せきれない
      # 書き方があるため（config/initializers/started_request_log_without_query.rb 参照）。
      path: data[:path].to_s.split('?', 2).first,
      status: data[:status],
      user_agent: data[:headers]['HTTP_USER_AGENT'],
      remote_ip: data[:headers]['REMOTE_ADDR']
    )
  end

  # データベースクエリ実行時間をログ出力
  ActiveSupport::Notifications.subscribe 'sql.active_record' do |name, started, finished, unique_id, data|
    # 長時間クエリのみログ出力（100ms以上）
    duration_ms = (finished - started) * 1000
    
    if duration_ms > 100
      StructuredLogger.performance(
        operation: 'database_query',
        duration_ms: duration_ms,
        sql: StructuredLogger.loggable_sql(data[:sql]),
        name: data[:name]
      )
    end
  end
end

# ========================================
# 🛡️ セキュリティイベント監視
# ========================================
# 認証失敗、不正アクセス試行等のログ出力用
class SecurityLogger
  def self.log_authentication_failure(email:, ip_address:, reason:)
    if defined?(StructuredLogger)
      StructuredLogger.security_event(
        event: 'authentication_failure'
      )
    else
      Rails.logger.warn "Authentication failure"
    end
  end

  def self.log_unauthorized_access(user_id:, resource:, ip_address:)
    if defined?(StructuredLogger)
      StructuredLogger.security_event(
        event: 'unauthorized_access',
        user_id: user_id,
        resource: resource,
        ip_address: ip_address
      )
    else
      Rails.logger.warn "Unauthorized access: user #{user_id} to #{resource} from #{ip_address}"
    end
  end
end
