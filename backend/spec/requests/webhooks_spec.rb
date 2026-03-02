require 'rails_helper'

RSpec.describe 'Webhooks API', type: :request do
  let(:webhook_secret) { 'whsec_test_secret' }
  let(:payload) { { type: 'checkout.session.completed', data: { object: { id: 'cs_test_xxx', amount_total: 500 } } }.to_json }
  let(:sig_header) { 't=12345,v1=fakesignature' }

  # 有効なStripeイベントのdouble（成功系テスト用）
  # Stripe::StripeObjectはmethod_missingでattributeにアクセスするため
  # instance_doubleではなくdoubleを使用
  let(:session_double) do
    double('StripeSession', id: 'cs_test_xxx', amount_total: 500)
  end

  let(:event_data_double) do
    double('StripeEventData', object: session_double)
  end

  let(:stripe_event_completed) do
    double(
      'StripeEvent',
      id: 'evt_test_duplicate',
      type: 'checkout.session.completed',
      data: event_data_double
    )
  end

  let(:stripe_event_other) do
    double('StripeEvent', id: 'evt_test_other', type: 'payment_intent.created', data: event_data_double)
  end

  describe 'POST /webhooks/stripe' do
    context 'STRIPE_WEBHOOK_SECRET が未設定の場合' do
      it '500 Internal Server Error を返す' do
        stub_const('ENV', ENV.to_hash.merge('STRIPE_WEBHOOK_SECRET' => nil))

        post '/webhooks/stripe',
          params: payload,
          headers: { 'Content-Type' => 'application/json', 'HOST' => 'backend' }

        expect(response).to have_http_status(:internal_server_error)
      end
    end

    context 'STRIPE_WEBHOOK_SECRET が設定されている場合' do
      before do
        stub_const('ENV', ENV.to_hash.merge('STRIPE_WEBHOOK_SECRET' => webhook_secret))
      end

      context '署名が不正な場合' do
        it '400 Bad Request を返す' do
          allow(Stripe::Webhook).to receive(:construct_event)
            .and_raise(Stripe::SignatureVerificationError.new('署名不一致', sig_header))

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(response).to have_http_status(:bad_request)
        end
      end

      context 'リクエストボディが不正なJSON の場合' do
        it '400 Bad Request を返す' do
          allow(Stripe::Webhook).to receive(:construct_event)
            .and_raise(JSON::ParserError.new('invalid json'))

          post '/webhooks/stripe',
            params: 'invalid-json',
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(response).to have_http_status(:bad_request)
        end
      end

      context '有効な署名 + checkout.session.completed の場合' do
        it '200 OK を返す' do
          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_completed)

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(response).to have_http_status(:ok)
        end
      end

      context '同じ event.id を2回受信した場合' do
        it '2回目は処理をスキップしつつ 200 OK を返し、記録は1件のまま' do
          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_completed)

          expect do
            post '/webhooks/stripe',
              params: payload,
              headers: {
                'Content-Type' => 'application/json',
                'Stripe-Signature' => sig_header,
                'HOST' => 'backend'
              }
            expect(response).to have_http_status(:ok)

            post '/webhooks/stripe',
              params: payload,
              headers: {
                'Content-Type' => 'application/json',
                'Stripe-Signature' => sig_header,
                'HOST' => 'backend'
              }
            expect(response).to have_http_status(:ok)
          end.to change(ProcessedWebhookEvent, :count).by(1)

          expect(ProcessedWebhookEvent.where(stripe_event_id: 'evt_test_duplicate').count).to eq(1)
        end
      end

      context '有効な署名 + 未対応イベントの場合' do
        it '200 OK を返す（無害に受理）' do
          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_other)

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(response).to have_http_status(:ok)
        end
      end
    end
  end
end
