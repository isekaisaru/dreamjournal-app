class Subscription < ApplicationRecord
  belongs_to :user

  STATUSES = %w[
    incomplete incomplete_expired trialing active past_due canceled unpaid paused
  ].freeze
  ACTIVE_STATUSES = %w[trialing active past_due].freeze

  validates :stripe_subscription_id, presence: true, uniqueness: true
  validates :stripe_customer_id, presence: true
  validates :status, inclusion: { in: STATUSES }
end
