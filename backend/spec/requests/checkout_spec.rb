require 'rails_helper'

RSpec.describe 'Checkout API', type: :request do
  let(:frontend_url) { 'http://localhost:3000' }
  let(:premium_price_id) { 'price_premium_test' }
  let(:checkout_url) { 'https://checkout.stripe.com/c/pay/cs_test_123' }

  around do |example|
    original_mode = Rails.configuration.stripe[:mode]
    Rails.configuration.stripe[:mode] = 'test'
    example.run
  ensure
    Rails.configuration.stripe[:mode] = original_mode
  end

  before do
    stub_const(
      'ENV',
      ENV.to_hash.merge(
        'FRONTEND_URL' => frontend_url,
        'STRIPE_PREMIUM_PRICE_ID' => premium_price_id
      )
    )
    allow(Stripe::Price).to receive(:retrieve)
      .and_return(double('StripePrice', livemode: false))
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
        double(
          'StripeCheckoutSession',
          id: 'cs_test_123',
          url: checkout_url,
          status: 'open',
          expires_at: 1.hour.from_now.to_i
        )
      end

      it 'stripe_customer_id が無い場合は customer を新規作成して保存する' do
        user = create(:user, stripe_customer_id: nil)
        created_customer = double('StripeCustomer', id: 'cus_created_123')

        expect(Stripe::Customer).to receive(:create)
          .with(
            hash_including(email: user.email, name: user.username, metadata: { user_id: user.id.to_s }),
            hash_including(idempotency_key: a_kind_of(String))
          )
          .and_return(created_customer)
        expect(Stripe::Checkout::Session).to receive(:create)
          .with(hash_including(
            customer: 'cus_created_123',
            client_reference_id: user.id.to_s,
            mode: 'payment',
            success_url: "#{frontend_url}/donation/success",
            cancel_url: "#{frontend_url}/donation/cancel"
          ), hash_including(idempotency_key: a_kind_of(String)))
          .and_return(checkout_session)

        authenticated_post('/checkout', user)

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['url']).to eq(checkout_url)
        expect(user.reload.stripe_customer_id).to eq('cus_created_123')

        attempt = user.checkout_attempts.find_by!(plan: 'donation')
        expect(attempt).to have_attributes(
          stripe_customer_id: 'cus_created_123',
          stripe_checkout_session_id: 'cs_test_123',
          status: 'open'
        )
        expect(attempt.expires_at).to be_present
      end

      it '同じuserのdonationとpremiumでCustomer作成のキーとCustomerを共有する' do
        user = create(:user, stripe_customer_id: nil)
        donation_attempt = create(:checkout_attempt, user: user, plan: 'donation', price_reference: 'donation:jpy:500')
        premium_attempt = create(:checkout_attempt, user: user, plan: 'premium', price_reference: premium_price_id)
        controller = CheckoutController.new
        allow(controller).to receive(:current_user).and_return(user)
        customer_keys = []
        customer = double('StripeCustomer', id: 'cus_shared_123')

        allow(Stripe::Customer).to receive(:retrieve).with('cus_shared_123').and_return(customer)
        allow(Stripe::Customer).to receive(:create) do |_params, options|
          customer_keys << options[:idempotency_key]
          customer
        end

        expect(controller.send(:ensure_stripe_customer_id!, donation_attempt)).to eq('cus_shared_123')
        expect(controller.send(:ensure_stripe_customer_id!, premium_attempt)).to eq('cus_shared_123')

        expect(Stripe::Customer).to have_received(:create).once
        expect(customer_keys).to eq([user.reload.stripe_customer_idempotency_key])
        expect(user.reload.stripe_customer_id).to eq('cus_shared_123')
        expect(donation_attempt.reload.stripe_customer_id).to eq('cus_shared_123')
        expect(premium_attempt.reload.stripe_customer_id).to eq('cus_shared_123')
      end

      it '既存userのCustomer IDを別AttemptのCustomer IDで上書きしない' do
        user = create(:user, stripe_customer_id: 'cus_canonical')
        attempt = create(
          :checkout_attempt,
          user: user,
          stripe_customer_id: 'cus_stale_attempt'
        )
        controller = CheckoutController.new
        allow(controller).to receive(:current_user).and_return(user)
        allow(Stripe::Customer).to receive(:retrieve).with('cus_canonical').and_return(double('StripeCustomer'))

        expect(controller.send(:ensure_stripe_customer_id!, attempt)).to eq('cus_canonical')
        expect(user.reload.stripe_customer_id).to eq('cus_canonical')
        expect(attempt.reload.stripe_customer_id).to eq('cus_canonical')
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
          ), hash_including(idempotency_key: a_kind_of(String)))
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
          ), hash_including(idempotency_key: a_kind_of(String)))
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

        expect(Stripe::Customer).not_to receive(:retrieve)
        expect(Stripe::Checkout::Session).not_to receive(:create)

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:internal_server_error)
        expect(JSON.parse(response.body)['error']).to include('プレミアム決済')
      end

      it 'uncertainな同一Checkoutの再試行では同じidempotency_keyをStripeへ渡す' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        allow(Stripe::Customer).to receive(:retrieve).with('cus_existing_123').and_return(double('StripeCustomer'))
        headers = auth_headers(user)

        captured_keys = []
        expect(Stripe::Customer).not_to receive(:create)
        allow(Stripe::Checkout::Session).to receive(:create) do |_params, opts|
          captured_keys << opts[:idempotency_key]
          raise Stripe::APIConnectionError, 'connection lost' if captured_keys.one?

          checkout_session
        end

        post '/checkout', params: { plan: 'premium' }, headers: headers, as: :json
        expect(response).to have_http_status(:service_unavailable)
        expect(user.checkout_attempts.find_by!(plan: 'premium').status).to eq('uncertain')

        post '/checkout', params: { plan: 'premium' }, headers: headers, as: :json
        expect(response).to have_http_status(:ok)

        expect(captured_keys.size).to eq(2)
        expect(captured_keys.uniq.size).to eq(1)
      end

      it 'Session作成のtimeoutではattemptをuncertainにして504を返す' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        allow(Stripe::Customer).to receive(:retrieve).and_return(double('StripeCustomer'))
        expect(Stripe::Checkout::Session).to receive(:create).once.and_raise(Timeout::Error, 'read timeout')

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:gateway_timeout)
        expect(user.checkout_attempts.find_by!(plan: 'premium').status).to eq('uncertain')
      end

      it 'Session作成のAPIConnectionErrorではattemptをuncertainにして503を返す' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        allow(Stripe::Customer).to receive(:retrieve).and_return(double('StripeCustomer'))
        expect(Stripe::Checkout::Session).to receive(:create).once
          .and_raise(Stripe::APIConnectionError, 'connection lost')

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:service_unavailable)
        expect(user.checkout_attempts.find_by!(plan: 'premium').status).to eq('uncertain')
      end

      it 'StripeのRateLimitErrorではattemptをuncertainにして429を返す' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        allow(Stripe::Customer).to receive(:retrieve).and_return(double('StripeCustomer'))
        allow(Stripe::Checkout::Session).to receive(:create)
          .and_raise(Stripe::RateLimitError, 'rate limited')

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:too_many_requests)
        expect(user.checkout_attempts.find_by!(plan: 'premium').status).to eq('uncertain')
      end

      it 'StripeのAPIErrorではattemptをuncertainにして503を返す' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        allow(Stripe::Customer).to receive(:retrieve).and_return(double('StripeCustomer'))
        allow(Stripe::Checkout::Session).to receive(:create)
          .and_raise(Stripe::APIError, 'stripe server error')

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:service_unavailable)
        expect(user.checkout_attempts.find_by!(plan: 'premium').status).to eq('uncertain')
      end

      it '有効なopen SessionがあればGETで回収し2個目を作らない' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        attempt = create(
          :checkout_attempt,
          user: user,
          plan: 'premium',
          price_reference: premium_price_id,
          stripe_customer_id: user.stripe_customer_id,
          stripe_checkout_session_id: 'cs_test_open',
          status: 'open',
          expires_at: 1.hour.from_now
        )
        existing_session = double(
          'StripeCheckoutSession',
          id: attempt.stripe_checkout_session_id,
          url: checkout_url,
          status: 'open',
          expires_at: attempt.expires_at.to_i
        )
        expect(Stripe::Checkout::Session).to receive(:retrieve).with('cs_test_open').and_return(existing_session)
        expect(Stripe::Checkout::Session).not_to receive(:create)
        expect(Stripe::Customer).not_to receive(:create)

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['url']).to eq(checkout_url)
        expect(user.checkout_attempts.count).to eq(1)
      end

      it 'SessionがcompleteでもWebhook前はopenを保持し2件目を作らない' do
        user = create(:user, stripe_customer_id: 'cus_existing_123', premium: false)
        attempt = create(
          :checkout_attempt,
          user: user,
          plan: 'premium',
          price_reference: premium_price_id,
          stripe_customer_id: user.stripe_customer_id,
          stripe_checkout_session_id: 'cs_test_complete',
          status: 'open',
          expires_at: 1.hour.from_now
        )
        completed_session = double(
          'StripeCheckoutSession',
          id: attempt.stripe_checkout_session_id,
          url: checkout_url,
          status: 'complete',
          expires_at: attempt.expires_at.to_i
        )
        expect(Stripe::Checkout::Session).to receive(:retrieve).twice
          .with('cs_test_complete')
          .and_return(completed_session)
        expect(Stripe::Checkout::Session).not_to receive(:create)

        headers = auth_headers(user)
        2.times do
          post '/checkout', params: { plan: 'premium' }, headers: headers, as: :json
          expect(response).to have_http_status(:conflict)
        end

        expect(attempt.reload.status).to eq('open')
        expect(user.checkout_attempts.count).to eq(1)
      end

      it 'Webhookのcompleted後に遅い同期応答が届いてもopenへ降格しない' do
        user = create(:user, stripe_customer_id: 'cus_existing_123', premium: false)
        attempt = create(
          :checkout_attempt,
          user: user,
          plan: 'premium',
          price_reference: premium_price_id,
          stripe_customer_id: user.stripe_customer_id,
          stripe_checkout_session_id: 'cs_test_complete_race',
          status: 'open'
        )
        completed_session = double(
          'StripeCheckoutSession',
          id: attempt.stripe_checkout_session_id,
          url: checkout_url,
          status: 'complete',
          expires_at: 1.hour.from_now.to_i
        )
        allow(Stripe::Checkout::Session).to receive(:retrieve) do
          attempt.update!(status: 'completed')
          completed_session
        end

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:conflict)
        expect(attempt.reload.status).to eq('completed')
        expect(user.checkout_attempts.count).to eq(1)
      end

      it '成功後に遅れてIdempotencyErrorが届いてもopenを維持する' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        allow(Stripe::Customer).to receive(:retrieve).and_return(double('StripeCustomer'))
        expect(Stripe::Checkout::Session).to receive(:create).once.and_return(checkout_session)
        headers = auth_headers(user)

        post '/checkout', params: { plan: 'premium' }, headers: headers, as: :json
        expect(response).to have_http_status(:ok)

        expect(Stripe::Checkout::Session).to receive(:retrieve).once
          .with('cs_test_123')
          .and_raise(Stripe::IdempotencyError, 'idempotency key is already in use')

        post '/checkout', params: { plan: 'premium' }, headers: headers, as: :json

        expect(response).to have_http_status(:conflict)
        expect(user.checkout_attempts.find_by!(plan: 'premium').status).to eq('open')
        expect(user.checkout_attempts.where(plan: 'premium').count).to eq(1)
      end

      it 'StripeがSessionをexpiredと返した場合だけ新しいattemptを開始する' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        old_attempt = create(
          :checkout_attempt,
          user: user,
          plan: 'premium',
          price_reference: premium_price_id,
          stripe_customer_id: user.stripe_customer_id,
          stripe_checkout_session_id: 'cs_test_expired',
          status: 'open',
          expires_at: 1.minute.ago
        )
        expired_session = double('StripeCheckoutSession', status: 'expired')
        allow(Stripe::Checkout::Session).to receive(:retrieve).with('cs_test_expired').and_return(expired_session)
        allow(Stripe::Customer).to receive(:retrieve).and_return(double('StripeCustomer'))
        expect(Stripe::Checkout::Session).to receive(:create).once.and_return(checkout_session)

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:ok)
        expect(old_attempt.reload.status).to eq('expired')
        expect(user.checkout_attempts.count).to eq(2)
        expect(user.checkout_attempts.order(:created_at).last.status).to eq('open')
      end

      it '無効な保存済みSessionをfailedにして次回は新しいattemptを使う' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        old_attempt = create(
          :checkout_attempt,
          user: user,
          plan: 'premium',
          price_reference: premium_price_id,
          stripe_customer_id: user.stripe_customer_id,
          stripe_checkout_session_id: 'cs_invalid_saved',
          status: 'open'
        )
        invalid_session_error = Stripe::InvalidRequestError.new('session not found', 'session')
        new_session = double(
          'StripeCheckoutSession',
          id: 'cs_replacement',
          url: checkout_url,
          status: 'open',
          expires_at: 1.hour.from_now.to_i
        )
        headers = auth_headers(user)

        expect(Stripe::Checkout::Session).to receive(:retrieve).with('cs_invalid_saved').and_raise(invalid_session_error)
        expect(Stripe::Customer).to receive(:retrieve).with('cus_existing_123').and_return(double('StripeCustomer'))
        expect(Stripe::Checkout::Session).to receive(:create).once.and_return(new_session)

        post '/checkout', params: { plan: 'premium' }, headers: headers, as: :json

        expect(response).to have_http_status(:ok)
        expect(old_attempt.reload.status).to eq('failed')
        replacement = user.checkout_attempts.where.not(id: old_attempt.id).order(:created_at).last
        expect(replacement).to have_attributes(stripe_checkout_session_id: 'cs_replacement', status: 'open')

        expect(Stripe::Checkout::Session).to receive(:retrieve).with('cs_replacement').and_return(new_session)
        expect(Stripe::Checkout::Session).not_to receive(:create)

        post '/checkout', params: { plan: 'premium' }, headers: headers, as: :json

        expect(response).to have_http_status(:ok)
        expect(user.checkout_attempts.where(stripe_checkout_session_id: 'cs_invalid_saved').count).to eq(1)
      end

      it '同一Checkoutの連続POSTでは有効なSessionを複数作らない' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        allow(Stripe::Customer).to receive(:retrieve).and_return(double('StripeCustomer'))
        expect(Stripe::Checkout::Session).to receive(:create).once.and_return(checkout_session)
        expect(Stripe::Checkout::Session).to receive(:retrieve).once
          .with('cs_test_123')
          .and_return(checkout_session)
        headers = auth_headers(user)

        2.times do
          post '/checkout', params: { plan: 'premium' }, headers: headers, as: :json
          expect(response).to have_http_status(:ok)
        end

        expect(user.checkout_attempts.count).to eq(1)
      end

      it 'Stripe入力エラーではattemptをfailedにして422を返し詳細を露出しない' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        allow(Stripe::Customer).to receive(:retrieve).and_return(double('StripeCustomer'))
        error = Stripe::InvalidRequestError.new('secret-sensitive-detail', 'line_items')
        allow(Stripe::Checkout::Session).to receive(:create).and_raise(error)

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.body).not_to include('secret-sensitive-detail')
        expect(user.checkout_attempts.find_by!(plan: 'premium').status).to eq('failed')
      end

      it '未分類のStripeエラーではattemptをuncertainにして503を返す' do
        user = create(:user, stripe_customer_id: 'cus_existing_123')
        allow(Stripe::Customer).to receive(:retrieve).and_return(double('StripeCustomer'))
        allow(Stripe::Checkout::Session).to receive(:create)
          .and_raise(Stripe::StripeError, 'result is unknown')

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:service_unavailable)
        expect(user.checkout_attempts.find_by!(plan: 'premium').status).to eq('uncertain')
      end

      it 'Customer作成の結果不明後も同じCustomer用idempotency_keyで回収する' do
        user = create(:user, stripe_customer_id: nil)
        headers = auth_headers(user)
        customer_keys = []
        allow(Stripe::Customer).to receive(:create) do |_params, opts|
          customer_keys << opts[:idempotency_key]
          raise Stripe::APIConnectionError, 'connection lost' if customer_keys.one?

          double('StripeCustomer', id: 'cus_recovered')
        end
        allow(Stripe::Checkout::Session).to receive(:create).and_return(checkout_session)

        post '/checkout', params: { plan: 'premium' }, headers: headers, as: :json
        expect(response).to have_http_status(:service_unavailable)
        persisted_customer_key = user.reload.stripe_customer_idempotency_key
        expect(persisted_customer_key).to be_present
        post '/checkout', params: { plan: 'premium' }, headers: headers, as: :json

        expect(response).to have_http_status(:ok)
        expect(customer_keys.uniq.size).to eq(1)
        expect(customer_keys).to all(eq(persisted_customer_key))
        expect(user.reload.stripe_customer_id).to eq('cus_recovered')
      end

      it 'Priceがlive modeならCustomerやCheckout Sessionを作成しない' do
        user = create(:user, stripe_customer_id: nil)
        allow(Stripe::Price).to receive(:retrieve)
          .with(premium_price_id)
          .and_return(double('StripePrice', livemode: true))

        expect(Stripe::Customer).not_to receive(:create)
        expect(Stripe::Checkout::Session).not_to receive(:create)

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:internal_server_error)
        expect(JSON.parse(response.body)['error']).to include('設定が一致していません')
        expect(user.reload.stripe_customer_id).to be_nil
      end
    end

    context 'plan=premium の場合' do
      let(:premium_price_id) { 'price_premium_test_123' }
      let(:subscription_checkout_url) { 'https://checkout.stripe.com/c/pay/cs_sub_test_456' }
      let(:subscription_session) do
        double(
          'StripeCheckoutSession',
          id: 'cs_sub_test_456',
          url: subscription_checkout_url,
          status: 'open',
          expires_at: 1.hour.from_now.to_i
        )
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
          ), hash_including(idempotency_key: a_kind_of(String)))
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

        expect(Stripe::Customer).not_to receive(:retrieve)
        expect(Stripe::Checkout::Session).not_to receive(:create)

        authenticated_post('/checkout', user, params: { plan: 'premium' })

        expect(response).to have_http_status(:internal_server_error)
      end
    end
  end

  describe 'GET /checkout/session' do
    it_behaves_like 'unauthorized request', :get, '/checkout/session'

    it 'session_id が無い場合は 400 を返す' do
      user = create(:user)

      authenticated_get('/checkout/session', user)

      expect(response).to have_http_status(:bad_request)
      expect(JSON.parse(response.body)['error']).to include('session_id')
    end

    it 'session_id を検証して成功レスポンスを返す' do
      user = create(:user)
      metadata = { 'user_id' => user.id.to_s }
      stripe_session = double(
        'StripeCheckoutSession',
        id: 'cs_sub_verified_123',
        mode: 'subscription',
        status: 'complete',
        payment_status: 'paid',
        metadata: metadata,
        client_reference_id: user.id.to_s
      )

      expect(Stripe::Checkout::Session).to receive(:retrieve).with('cs_sub_verified_123').and_return(stripe_session)

      authenticated_get('/checkout/session', user, params: { session_id: 'cs_sub_verified_123' })

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to include(
        'verified' => true,
        'session_id' => 'cs_sub_verified_123',
        'status' => 'complete',
        'payment_status' => 'paid'
      )
    end

    it '別ユーザーの session_id は 403 を返す' do
      user = create(:user)
      stripe_session = double(
        'StripeCheckoutSession',
        id: 'cs_sub_other_user',
        mode: 'subscription',
        status: 'complete',
        payment_status: 'paid',
        metadata: { 'user_id' => '999999' },
        client_reference_id: '999999'
      )

      expect(Stripe::Checkout::Session).to receive(:retrieve).with('cs_sub_other_user').and_return(stripe_session)

      authenticated_get('/checkout/session', user, params: { session_id: 'cs_sub_other_user' })

      expect(response).to have_http_status(:forbidden)
    end
  end
end
