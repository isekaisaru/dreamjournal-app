require 'rails_helper'

RSpec.describe 'Checkout API', type: :request do
  let(:frontend_url) { 'http://localhost:3000' }
  let(:premium_price_id) { 'price_premium_500' }
  let(:checkout_url) { 'https://checkout.stripe.com/c/pay/cs_test_123' }

  before do
    stub_const(
      'ENV',
      ENV.to_hash.merge(
        'FRONTEND_URL' => frontend_url,
        'STRIPE_PREMIUM_PRICE_ID' => premium_price_id
      )
    )
  end

  describe 'POST /checkout' do
    it_behaves_like 'unauthorized request', :post, '/checkout'

    context 'FRONTEND_URL が未設定の場合' do
      it 'nil のとき 500 を返す' do
        stub_const('ENV', ENV.to_hash.merge('FRONTEND_URL' => nil))
        user = create(:user)

        expect(Stripe::Checkout::Session).not_to receive(:create)

        authenticated_post('/checkout', user)

        expect(response).to have_http_status(:internal_server_error)
        expect(JSON.parse(response.body)['error']).to be_present
      end

      it '空文字列のとき 500 を返す' do
        stub_const('ENV', ENV.to_hash.merge('FRONTEND_URL' => ''))
        user = create(:user)

        expect(Stripe::Checkout::Session).not_to receive(:create)

        authenticated_post('/checkout', user)

        expect(response).to have_http_status(:internal_server_error)
        expect(JSON.parse(response.body)['error']).to be_present
      end
    end

    context '認証済みユーザーの場合' do
      let(:checkout_session) do
        double('StripeCheckoutSession', id: 'cs_test_123', url: checkout_url)
      end

      it 'stripe_customer_id が無い場合は customer を新規作成して保存する' do
        user = create(:user, stripe_customer_id: nil)
        created_customer = double('StripeCustomer', id: 'cus_created_123')

        expect(Stripe::Customer).to receive(:create)
          .with(hash_including(email: user.email, name: user.username, metadata: { user_id: user.id.to_s }))
          .and_return(created_customer)
        expect(Stripe::Checkout::Session).to receive(:create)
          .with(hash_including(
            customer: 'cus_created_123',
            client_reference_id: user.id.to_s,
            mode: 'payment',
            success_url: "#{frontend_url}/donation/success",
            cancel_url: "#{frontend_url}/donation/cancel"
          ))
          .and_return(checkout_session)

        authenticated_post('/checkout', user)

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['url']).to eq(checkout_url)
        expect(user.reload.stripe_customer_id).to eq('cus_created_123')
      end

      it 'stripe_customer_id がある場合は再利用して customer を新規作成しない' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')

        expect(Stripe::Customer).to receive(:retrieve).with('cus_existing_123').and_return(double('StripeCustomer'))
        expect(Stripe::Customer).not_to receive(:create)
        expect(Stripe::Checkout::Session).to receive(:create)
          .with(hash_including(
            customer: 'cus_existing_123',
            client_reference_id: user.id.to_s,
            mode: 'payment',
            success_url: "#{frontend_url}/donation/success",
            cancel_url: "#{frontend_url}/donation/cancel"
          ))
          .and_return(checkout_session)

        authenticated_post('/checkout', user)

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['url']).to eq(checkout_url)
        expect(user.reload.stripe_customer_id).to eq('cus_existing_123')
      end

      it 'plan=premium のとき subscription mode の Checkout Session を作成する' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')

        expect(Stripe::Customer).to receive(:retrieve).with('cus_existing_123').and_return(double('StripeCustomer'))
        expect(Stripe::Checkout::Session).to receive(:create)
          .with(hash_including(
            customer: 'cus_existing_123',
            client_reference_id: user.id.to_s,
            mode: 'subscription',
            line_items: [hash_including(price: premium_price_id, quantity: 1)],
            success_url: "#{frontend_url}/subscription/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url: "#{frontend_url}/subscription/cancel"
          ))
          .and_return(checkout_session)

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['url']).to eq(checkout_url)
      end

      it 'すでに premium のユーザーはサブスク Checkout を作成しない' do
        user = create(:user, stripe_customer_id: 'cus_existing_123', premium: true)

        expect(Stripe::Checkout::Session).not_to receive(:create)

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:unprocessable_content)
        expect(JSON.parse(response.body)['error']).to include('すでにプレミアム')
      end

      it 'STRIPE_PREMIUM_PRICE_ID が未設定なら 500 を返す' do
        stub_const(
          'ENV',
          ENV.to_hash.merge(
            'FRONTEND_URL' => frontend_url,
            'STRIPE_PREMIUM_PRICE_ID' => nil
          )
        )
        user = create(:user, stripe_customer_id: 'cus_existing_123')

        expect(Stripe::Customer).to receive(:retrieve).with('cus_existing_123').and_return(double('StripeCustomer'))
        expect(Stripe::Checkout::Session).not_to receive(:create)

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:internal_server_error)
        expect(JSON.parse(response.body)['error']).to include('プレミアム決済')
      end
    end

    context 'plan=premium の場合' do
      let(:premium_price_id) { 'price_premium_test_123' }
      let(:subscription_checkout_url) { 'https://checkout.stripe.com/c/pay/cs_sub_test_456' }
      let(:subscription_session) do
        double('StripeCheckoutSession', id: 'cs_sub_test_456', url: subscription_checkout_url)
      end

      before do
        stub_const('ENV', ENV.to_hash.merge(
          'FRONTEND_URL' => frontend_url,
          'STRIPE_PREMIUM_PRICE_ID' => premium_price_id
        ))
      end

      it 'mode=subscription で Checkout Session を作成する' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')

        expect(Stripe::Customer).to receive(:retrieve).with('cus_existing_123').and_return(double('StripeCustomer'))
        expect(Stripe::Checkout::Session).to receive(:create)
          .with(hash_including(
            mode: 'subscription',
            customer: 'cus_existing_123',
            client_reference_id: user.id.to_s,
            line_items: [{ price: premium_price_id, quantity: 1 }],
            metadata: { user_id: user.id.to_s, plan: 'premium' },
            payment_method_types: ['card'],
            success_url: "#{frontend_url}/subscription/success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url:  "#{frontend_url}/subscription/cancel"
          ))
          .and_return(subscription_session)

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['url']).to eq(subscription_checkout_url)
      end

      it 'STRIPE_PREMIUM_PRICE_ID が未設定なら 500 を返す' do
        stub_const('ENV', ENV.to_hash.merge(
          'FRONTEND_URL' => frontend_url,
          'STRIPE_PREMIUM_PRICE_ID' => nil
        ))
        user = create(:user, stripe_customer_id: 'cus_existing_123')

        expect(Stripe::Customer).to receive(:retrieve).with('cus_existing_123').and_return(double('StripeCustomer'))
        expect(Stripe::Checkout::Session).not_to receive(:create)

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:internal_server_error)
      end
    end
  end
end
