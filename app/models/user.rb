class User < ApplicationRecord
  has_secure_password

  validates :email, presence: turu, uniqueness: true
  validates :username, presence: turu, uniqueness: true
  validates :password, presence: turu, length: { minimum: 6 }
end
