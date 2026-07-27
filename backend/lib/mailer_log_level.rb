# ActionMailer のログ出力レベルを決める。
#
# 【なぜ必要か】
# ActionMailer の LogSubscriber は、メール送信時に2種類のログを出す:
#   info  → "Delivered mail <message-id> (4.2ms)"
#   debug → メール本文まるごと（RFC822形式のヘッダ＋本文）
#
# 本文にはパスワードリセットや メールアドレス確認の URL がそのまま入るため、
# RAILS_LOG_LEVEL=debug で運用すると、ログを見られる人が
# 誰のアカウントでもパスワードを再設定できてしまう。
# トークンをDBに digest 保存している対策（#414 / #415 / #421）が、
# ログ経由で無効化されることになる。
#
# 実際 2026-07-27 の本番ログには、パスワードリセットのリンクが
# base64 のメール本文としてそのまま出力されていた。
#
# そこで ActionMailer 専用のロガーを用意し、アプリ全体が debug でも
# INFO より詳細にはしない。「Delivered mail ...」は残るので、
# 送信を試みた記録自体は追える。
module MailerLogLevel
  # アプリのログレベルを受け取り、メール用に安全なレベルを返す。
  # - debug(0) が渡されても INFO(1) まで引き上げる（本文を出さない）
  # - warn(2) 以上で運用しているときは、それより饒舌にはしない
  def self.safe_level(app_level)
    [app_level.to_i, Logger::INFO].max
  end
end
