require 'rails_helper'

RSpec.describe CheckoutAttempt, type: :model do
  it 'supports the checkout lifecycle statuses' do
    expect(described_class::STATUSES).to contain_exactly(
      'pending', 'open', 'uncertain', 'completed', 'expired', 'failed'
    )
  end

  it 'requires persistent Session and Customer idempotency keys' do
    attempt = build(:checkout_attempt, idempotency_key: nil, customer_idempotency_key: nil)

    expect(attempt).not_to be_valid
    expect(attempt.errors[:idempotency_key]).to be_present
    expect(attempt.errors[:customer_idempotency_key]).to be_present
  end

  it 'treats pending, open, and uncertain attempts as recoverable' do
    recoverable = CheckoutAttempt::RECOVERABLE_STATUSES.map do |status|
      create(:checkout_attempt, status: status)
    end
    create(:checkout_attempt, status: 'failed')

    expect(described_class.recoverable).to match_array(recoverable)
  end

  it 'rejects a second active attempt for the same user and plan at the database level' do
    described_class::RECOVERABLE_STATUSES.each do |existing_status|
      user = create(:user)
      create(:checkout_attempt, user: user, plan: 'premium', status: existing_status)

      described_class::RECOVERABLE_STATUSES.each do |new_status|
        expect do
          described_class.transaction(requires_new: true) do
            create(:checkout_attempt, user: user, plan: 'premium', status: new_status)
          end
        end.to raise_error(ActiveRecord::RecordNotUnique)
      end
    end
  end

  it 'allows a new active attempt after a terminal status' do
    %w[completed expired failed].each do |terminal_status|
      user = create(:user)
      create(:checkout_attempt, user: user, plan: 'premium', status: terminal_status)

      expect do
        create(:checkout_attempt, user: user, plan: 'premium', status: 'pending')
      end.to change { user.checkout_attempts.count }.by(1)
    end
  end

  it 'does not downgrade open or completed after a delayed error' do
    %w[open completed].each do |successful_status|
      attempt = create(:checkout_attempt, status: successful_status)

      attempt.transition_after_error!('uncertain')
      expect(attempt.status).to eq(successful_status)

      attempt.transition_after_error!('failed')
      expect(attempt.status).to eq(successful_status)
    end
  end

  it 'terminates a recoverable attempt after Stripe confirms its session is invalid' do
    %w[pending open uncertain].each do |status|
      attempt = create(:checkout_attempt, status: status, stripe_checkout_session_id: 'cs_invalid')

      attempt.transition_after_invalid_session!

      expect(attempt.reload.status).to eq('failed')
    end
  end

  it 'recovers the existing active attempt after a database uniqueness race' do
    user = create(:user)
    existing = create(:checkout_attempt, user: user, plan: 'premium', status: 'pending')
    attributes = attributes_for(:checkout_attempt, plan: 'premium')

    allow(user).to receive(:with_lock).and_raise(ActiveRecord::RecordNotUnique, 'concurrent insert')

    expect(
      described_class.find_or_create_recoverable!(user: user, plan: 'premium', attributes: attributes)
    ).to eq(existing)
  end
end
