class User < ApplicationRecord
  has_secure_password
  has_many :dreams, dependent: :destroy
  validates :email, presence: true, uniqueness: true, unless: :trial_user?
  validates :username, presence: true, uniqueness: true, unless: :trial_user?
  validates :password, presence: true, length: { minimum: 6 }, unless: :trial_user?

  def trial_user?
    self.trial_user
  end
end
