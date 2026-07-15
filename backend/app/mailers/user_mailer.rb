class UserMailer < ApplicationMailer
  # パスワードリセットメールを送信します
  # 生トークンは引数で受け取る（DBには digest しか保存されていないため）
  def password_reset(user, token)
    @user = user

    # フロントエンドのパスワードリセットページのURLを構築します。
    # このURLはフロントエンドの構成に合わせて変更してください。
    frontend_url = ENV.fetch('FRONTEND_URL', 'http://localhost:8000')
    @reset_url = "#{frontend_url}/password-reset/#{token}"

    mail(to: @user.email,
         subject: "[ユメログ] パスワードリセット")
  end

  # メールアドレス確認メールを送信します
  # 生トークンは引数で受け取る（DBには digest しか保存されていないため）
  def email_verification(user, token)
    @user = user
    frontend_url = ENV.fetch('FRONTEND_URL', 'http://localhost:8000')
    @verification_url = "#{frontend_url}/verify-email?token=#{token}"

    mail(to: @user.email,
         subject: "[ユメログ] メールアドレスの確認")
  end
end
