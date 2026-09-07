require 'rails_helper'

RSpec.describe CheckoutController, type: :controller do
  self.use_transactional_tests = false

  after do
    CheckoutAttempt.where(user_id: @user_id).delete_all if @user_id
    User.where(id: @user_id).delete_all if @user_id
  end

  it '同一userのdonationとpremiumを並行開始してもCustomer用idempotency keyを共有する' do
    user = create(:user, stripe_customer_id: nil)
    @user_id = user.id
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
end
