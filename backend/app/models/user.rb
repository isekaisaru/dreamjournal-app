class User < ApplicationRecord
  # パスワード認証機能を提供
  has_secure_password
  # 関連付け
  has_many :dreams, dependent: :destroy

  # バリデーション
  validates :email, presence: true, uniqueness: true, unless: :trial_user?
  validates :username, presence: true, uniqueness: true, unless: :trial_user?
  validates :password, presence: true, length: { minimum: 6 }, unless: :trial_user?

  # JWTトークンを生成する
  def generate_jwt
    JWT.encode(
      {user_id: self.id, exp: jwt_expiration_time}, # ペイロード 
      Rails.application.credentials.secret_key_base) # シークレットキー
  end

  private

  # JWTの有効期限を環境変数で設定
  def jwt_expiration_time
    ENV.fetch('JWT_EXPIRATION_TIME', 24.hours.from_now.to_i) # 24時間
  end
end
