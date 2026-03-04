class Payment < ApplicationRecord
  belongs_to :user

  validates :stripe_session_id, presence: true, uniqueness: true
  validates :amount, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :status, presence: true
end
