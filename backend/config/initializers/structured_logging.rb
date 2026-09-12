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
  Rails.logger = Logger.new(STDOUT)
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
      path: data[:path],
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
        sql: data[:sql],
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
