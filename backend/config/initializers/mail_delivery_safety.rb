# メール配信まわりの安全策。
# 詳細な理由は lib/mailer_log_level.rb / lib/mail_delivery_config.rb のコメント参照。
#
# 1. メール本文をログに出さない（トークン漏洩の防止）
# 2. 設定不足を起動時に警告する（無音の配信失敗に気づけるようにする）
#
# すべての初期化が終わってから実行する。production では
# structured_logging.rb が Rails.logger を JSON ロガーに差し替えるため、
# その後でないと formatter を引き継げない。
Rails.application.config.after_initialize do
  next unless Rails.env.production?

  # --- 1. ActionMailer のログを INFO 止まりにする -----------------------
  # Rails 全体が debug でも、メール本文（＝リセットURL）は出力しない。
  base_logger = Rails.logger
  mailer_logger = ActiveSupport::Logger.new($stdout)
  mailer_logger.formatter = base_logger.formatter
  mailer_logger.level = MailerLogLevel.safe_level(base_logger.level)
  ActionMailer::Base.logger = mailer_logger

  # --- 2. 設定が足りなければ起動時に警告する ---------------------------
  # 値は出さず、不足しているキー名だけを記録する。
  warning = MailDeliveryConfig.warning_message
  if warning
    Rails.logger.warn(
      event_type: 'config',
      component: 'mail_delivery',
      message: warning,
      missing_keys: MailDeliveryConfig.missing_env_keys
    )
  end
end
