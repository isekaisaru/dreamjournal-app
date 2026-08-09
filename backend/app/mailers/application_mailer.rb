class ApplicationMailer < ActionMailer::Base
  # Resend等の配信サービスは送信元ドメインの所有検証を要求するため、
  # コード変更なしで差し替えられるよう環境変数化する。
  # - テスト運用: onboarding@resend.dev（Resendアカウント本人宛のみ配信可）
  # - 本運用: no-reply@<Resendで検証済みの独自ドメイン>
  default from: ENV.fetch("MAIL_FROM", "support@yumelog.com")
  layout "mailer"
end
