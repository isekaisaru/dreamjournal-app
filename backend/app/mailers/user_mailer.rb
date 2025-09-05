class UserMailer < ApplicationMailer
  # パスワードリセットメールを送信します
  def password_reset(user)
    @user = user

    # フロントエンドのパスワードリセットページのURLを構築します。
    # このURLはフロントエンドの構成に合わせて変更してください。
    frontend_url = ENV.fetch('FRONTEND_URL', 'http://localhost:8000')
    @reset_url = "#{frontend_url}/password-reset/#{@user.reset_password_token}"

    mail(to: @user.email,
         subject: "[ユメログ] パスワードリセット")
  end
end
