class CheckoutAttempt < ApplicationRecord
  STATUSES = %w[pending open uncertain completed expired failed].freeze
  RECOVERABLE_STATUSES = %w[pending open uncertain].freeze
  ERROR_TRANSITION_STATUSES = %w[pending uncertain].freeze

  belongs_to :user

  scope :recoverable, -> { where(status: RECOVERABLE_STATUSES) }

  validates :plan, :price_reference, :idempotency_key, :customer_idempotency_key, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :idempotency_key, :customer_idempotency_key, uniqueness: true
  validates :stripe_checkout_session_id, uniqueness: true, allow_nil: true

  def self.find_or_create_recoverable!(user:, plan:, attributes:)
    user.with_lock do
      latest_recoverable_for(user: user, plan: plan) || user.checkout_attempts.create!(attributes)
    end
  rescue ActiveRecord::RecordNotUnique
    latest_recoverable_for(user: user, plan: plan) || raise
  end

  def self.latest_recoverable_for(user:, plan:)
    user.checkout_attempts.recoverable.where(plan: plan).order(created_at: :desc).first
  end

  # Stripeへのリクエストが並行した場合、遅れて届いたエラーで成功状態を降格させない。
  def transition_after_error!(new_status)
    raise ArgumentError, "invalid error status: #{new_status}" unless %w[uncertain failed].include?(new_status)

    self.class
      .where(id: id, status: ERROR_TRANSITION_STATUSES)
      .update_all(status: new_status, updated_at: Time.current)
    reload
  end

  def transition_after_invalid_session!
    self.class
      .where(id: id, status: RECOVERABLE_STATUSES)
      .update_all(status: 'failed', updated_at: Time.current)
    reload
  end

  # Webhookが先にcompletedへ進めた場合、遅いController応答でopenへ戻さない。
  def persist_open_session!(stripe_session_id:, expires_at:)
    self.class
      .where(id: id, status: RECOVERABLE_STATUSES)
      .update_all(
        stripe_checkout_session_id: stripe_session_id,
        status: 'open',
        expires_at: expires_at,
        updated_at: Time.current
      )
    reload
  end
end
