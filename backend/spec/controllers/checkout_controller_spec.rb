require 'rails_helper'

RSpec.describe CheckoutController, type: :controller do
  self.use_transactional_tests = false

  after do
    CheckoutAttempt.where(user_id: @user_ids).delete_all if @user_ids
    User.where(id: @user_ids).delete_all if @user_ids
  end

  it '同一userのdonationとpremiumを並行開始してもCustomer用idempotency keyを共有する' do
    user = create(:user, stripe_customer_id: nil)
    @user_ids = [user.id]
    start_gate = Queue.new

    attempts = [
      ['donation', 'donation:jpy:500'],
      ['premium', 'price_premium_test']
    ].map do |plan, price_reference|
      controller = described_class.new
      allow(controller).to receive(:current_user) { User.find(user.id) }

      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          start_gate.pop
          controller.send(:find_or_create_checkout_attempt!, plan: plan, price_reference: price_reference)
        end
      end
    end

    2.times { start_gate << true }
    attempts = attempts.map(&:value)

    persisted_key = user.reload.stripe_customer_idempotency_key
    expect(persisted_key).to be_present
    expect(attempts.map(&:customer_idempotency_key).uniq).to eq([persisted_key])
    expect(CheckoutAttempt.where(user: user).pluck(:plan)).to contain_exactly('donation', 'premium')
  end

  it '別userには別のcanonical Customer idempotency keyを保存する' do
    first_user = create(:user, stripe_customer_id: nil)
    second_user = create(:user, stripe_customer_id: nil)
    @user_ids = [first_user.id, second_user.id]

    keys = [first_user, second_user].map do |user|
      controller = described_class.new
      allow(controller).to receive(:current_user).and_return(user)
      controller.send(:customer_idempotency_key_for_current_user)
    end

    expect(keys.uniq.size).to eq(2)
    expect(first_user.reload.stripe_customer_idempotency_key).to eq(keys.first)
    expect(second_user.reload.stripe_customer_idempotency_key).to eq(keys.last)
  end
end
