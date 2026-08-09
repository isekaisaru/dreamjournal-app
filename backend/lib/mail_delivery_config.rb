# メール配信（SMTP）の設定が揃っているかを判定する。
#
# 【なぜ必要か】
# production では次の設定になっている:
#   - delivery_method = :smtp（接続先は SMTP_USERNAME / SMTP_PASSWORD）
#   - from は ENV.fetch("MAIL_FROM", "support@yumelog.com")
# これらが未設定でも Rails は例外を出さず、ログには
# 「Delivered mail ...」とだけ残るため、送信されていないことに気づけない。
# 実際、2026-07-27 のパスワードリセット調査では、MAIL_FROM が未設定で
# 既定値にフォールバックしたまま、メールが1通も届いていなかった。
#
# そこで起動時にこの判定を使い、不足している設定名をログに出す。
module MailDeliveryConfig
  # これらが1つでも欠けると、実質メールは送信できない
  REQUIRED_ENV_KEYS = %w[SMTP_USERNAME SMTP_PASSWORD MAIL_FROM].freeze

  # 未設定（空文字・空白のみを含む）のキーを返す
  def self.missing_env_keys(env = ENV)
    REQUIRED_ENV_KEYS.reject { |key| env[key].to_s.strip != '' }
  end

  def self.configured?(env = ENV)
    missing_env_keys(env).empty?
  end

  # 起動ログ用のメッセージ。設定が揃っていれば nil を返す。
  # 値そのものは絶対に含めない（APIキーが漏れるため）。
  def self.warning_message(env = ENV)
    missing = missing_env_keys(env)
    return nil if missing.empty?

    "メール送信の設定が不足しています（#{missing.join(', ')}）。" \
      'この状態ではパスワードリセット・確認メールは配信されません。'
  end
end
