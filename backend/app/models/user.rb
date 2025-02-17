class User < ApplicationRecord
  # パスワード認証機能を提供
  has_secure_password
  has_many :dreams, dependent: :destroy

  # バリデーション
  validates :email, presence: true, uniqueness: true, unless: :trial_user?
  validates :username, presence: true, uniqueness: true, unless: :trial_user?
  validates :password, presence: true, length: { minimum: 6 }, unless: :trial_user?

  # JWTトークンを生成する
  def generate_jwt
    AuthService.encode_token(self.id)
  end

  private

  # トライアルユーザーかどうかを判定する
  def trial_user?
    self.email.blank?
  end
end
