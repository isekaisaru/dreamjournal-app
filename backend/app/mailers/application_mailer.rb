class ApplicationMailer < ActionMailer::Base
  default from: "support@yumelog.com" # 好きな送信元アドレスに変更してください
  layout "mailer"
end
