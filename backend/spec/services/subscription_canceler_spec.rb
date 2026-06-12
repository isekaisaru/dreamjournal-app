require 'rails_helper'

RSpec.describe SubscriptionCanceler do
  let(:user) { create(:user) }

  describe '#call' do
    context 'active なサブスクがある場合' do
      it '正しい stripe_subscription_id で Stripe::Subscription.cancel を呼ぶ' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_active_1', status: 'active')

        expect(Stripe::Subscription).to receive(:cancel).with('sub_active_1')

        described_class.new(user).call
      end
    end

    context 'past_due なサブスクがある場合' do
      it '解約する' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_pastdue_1', status: 'past_due')

        expect(Stripe::Subscription).to receive(:cancel).with('sub_pastdue_1')

        described_class.new(user).call
      end
    end

    context 'canceled なサブスクのみの場合' do
      it 'Stripe を呼ばない（スキップ）' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_canceled_1', status: 'canceled')

        expect(Stripe::Subscription).not_to receive(:cancel)

        described_class.new(user).call
      end
    end

    context '複数の active サブスクがある場合' do
      it '全件解約する' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_multi_1', status: 'active')
        create(:subscription, user: user, stripe_subscription_id: 'sub_multi_2', status: 'past_due')

        expect(Stripe::Subscription).to receive(:cancel).with('sub_multi_1')
        expect(Stripe::Subscription).to receive(:cancel).with('sub_multi_2')

        described_class.new(user).call
      end
    end

    context 'Stripe 側に既に存在しない場合（resource_missing）' do
      it '成功扱いし、CancellationError を raise しない' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_gone_1', status: 'active')

        allow(Stripe::Subscription).to receive(:cancel).and_raise(
          Stripe::InvalidRequestError.new('No such subscription: sub_gone_1', 'subscription', code: 'resource_missing')
        )

        expect { described_class.new(user).call }.not_to raise_error
      end
    end

    context 'resource_missing 以外の InvalidRequestError の場合' do
      it 'CancellationError を raise する' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_bad_1', status: 'active')

        allow(Stripe::Subscription).to receive(:cancel).and_raise(
          Stripe::InvalidRequestError.new('Invalid parameter', 'subscription', code: 'parameter_invalid')
        )

        expect { described_class.new(user).call }.to raise_error(SubscriptionCanceler::CancellationError)
      end
    end

    context 'ネットワーク障害（APIConnectionError）の場合' do
      it 'CancellationError を raise する' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_net_1', status: 'active')

        allow(Stripe::Subscription).to receive(:cancel).and_raise(
          Stripe::APIConnectionError.new('connection failed')
        )

        expect { described_class.new(user).call }.to raise_error(SubscriptionCanceler::CancellationError)
      end
    end

    context 'サブスクが無い場合' do
      it 'Stripe を呼ばず正常に return する' do
        expect(Stripe::Subscription).not_to receive(:cancel)

        expect { described_class.new(user).call }.not_to raise_error
      end
    end
  end
end
