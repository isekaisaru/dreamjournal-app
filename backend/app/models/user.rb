class User < ApplicationRecord
  has_secure_password
  has_many :dreams, dependent: :destroy
  validates :email, presence: true, uniqueness: true, unless: :trial_user?
  validates :username, presence: true, uniqueness: true, unless: :trial_user?
  validates :password, presence: true, length: { minimum: 6 }, unless: :trial_user?

  def generate_jwt
    JWT.encode({user_id: self.id, exp: 60.days.from_now.to_i}, Rails.application.credentials.secret_key_base)
  end
end
