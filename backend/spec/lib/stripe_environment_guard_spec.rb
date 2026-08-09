require 'rails_helper'

RSpec.describe StripeEnvironmentGuard do
  describe '.resolve_mode' do
    it 'productionでは未設定時にliveを返す' do
      expect(described_class.resolve_mode(configured_mode: nil, rails_env: 'production')).to eq('live')
    end

    it 'production以外では未設定時にtestを返す' do
      expect(described_class.resolve_mode(configured_mode: nil, rails_env: 'test')).to eq('test')
    end

    it '明示されたtestを返す' do
      expect(described_class.resolve_mode(configured_mode: 'test', rails_env: 'production')).to eq('test')
    end

    it '不正なmodeを拒否する' do
      expect do
        described_class.resolve_mode(configured_mode: 'staging', rails_env: 'production')
      end.to raise_error(described_class::ConfigurationError, /STRIPE_MODE/)
    end
  end

  describe '.validate_key_modes!' do
    it '同じtest modeのキーを受理する' do
      expect do
        described_class.validate_key_modes!(
          mode: 'test',
          secret_key: 'sk_test_example',
          publishable_key: 'pk_test_example'
        )
      end.not_to raise_error
    end

    it 'Secret Keyのmode不一致を拒否する' do
      expect do
        described_class.validate_key_modes!(
          mode: 'live',
          secret_key: 'sk_test_example',
          publishable_key: nil
        )
      end.to raise_error(described_class::ConfigurationError, /STRIPE_SECRET_KEY/)
    end

    it 'Publishable Keyのmode不一致を拒否する' do
      expect do
        described_class.validate_key_modes!(
          mode: 'test',
          secret_key: nil,
          publishable_key: 'pk_live_example'
        )
      end.to raise_error(described_class::ConfigurationError, /STRIPE_PUBLISHABLE_KEY/)
    end

    it '未設定のキーは起動時検証をスキップする' do
      expect do
        described_class.validate_key_modes!(
          mode: 'test',
          secret_key: nil,
          publishable_key: ''
        )
      end.not_to raise_error
    end
  end

  describe '.validate_price!' do
    it 'modeと一致するPriceを受理する' do
      price = double('StripePrice', livemode: false)

      expect do
        described_class.validate_price!(price: price, mode: 'test')
      end.not_to raise_error
    end

    it 'modeと異なるPriceを拒否する' do
      price = double('StripePrice', livemode: true)

      expect do
        described_class.validate_price!(price: price, mode: 'test')
      end.to raise_error(described_class::ConfigurationError, /Stripe Price/)
    end
  end

  describe '.validate_event!' do
    it 'modeと一致するWebhook Eventを受理する' do
      event = double('StripeEvent', livemode: true)

      expect do
        described_class.validate_event!(event: event, mode: 'live')
      end.not_to raise_error
    end

    it 'modeと異なるWebhook Eventを拒否する' do
      event = double('StripeEvent', livemode: false)

      expect do
        described_class.validate_event!(event: event, mode: 'live')
      end.to raise_error(described_class::ConfigurationError, /Stripe Event/)
    end
  end
end
