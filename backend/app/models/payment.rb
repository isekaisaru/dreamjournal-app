class Payment < ApplicationRecord
  belongs_to :user

  validates :stripe_checkout_session_id, presence: true, uniqueness: true
  validates :stripe_payment_intent_id, uniqueness: true, allow_nil: true
  validates :amount, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :currency, presence: true, length: { is: 3 }
  validates :status, presence: true
end
