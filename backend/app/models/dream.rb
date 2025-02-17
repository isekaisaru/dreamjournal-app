class Dream < ApplicationRecord
  belongs_to :user, optional: false

  validates :title, presence: true, length: { maximum: 100 }
  validates :description, presence: true, length: { maximum: 1000 }
end
