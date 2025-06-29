class Dream < ApplicationRecord
  belongs_to :user, optional: false
  has_many :dream_emotions, dependent: :destroy
  has_many :emotions, through: :dream_emotions

  validates :title, presence: true, length: { maximum: 100 }
  validates :content, presence: true, length: { maximum: 1000 }
end
