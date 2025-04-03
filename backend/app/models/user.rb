class User < ApplicationRecord
  # パスワード認証機能を提供
  has_secure_password
  has_many :dreams, dependent: :destroy

  # バリデーション
  validates :email, presence: true, uniqueness: true
  validates :username, presence: true, uniqueness: true
  validates :password, presence: true, length: { minimum: 6 }

  # JWTトークンを生成する
  def generate_jwt
    AuthService.encode_token(self.id)
  end
end
