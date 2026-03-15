require 'rails_helper'

RSpec.describe 'Webhooks API', type: :request do
  let(:webhook_secret) { 'whsec_test_secret' }
  let(:payload) do
    {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_xxx',
          payment_intent: 'pi_test_123',
          amount_total: 500,
          currency: 'jpy',
          payment_status: 'paid'
        }
      }
    }.to_json
  end
  let(:sig_header) { 't=12345,v1=fakesignature' }
  let(:customer_email) { 'webhook-user@example.com' }

  # 有効なStripeイベントのdouble（成功系テスト用）
  # Stripe::StripeObjectはmethod_missingでattributeにアクセスするため
  # instance_doubleではなくdoubleを使用
  let(:customer_details_double) do
    double('StripeCustomerDetails', email: customer_email)
  end

  let(:session_double) do
    double(
      'StripeSession',
      id: 'cs_test_xxx',
      payment_intent: 'pi_test_123',
      amount_total: 500,
      currency: 'jpy',
      payment_status: 'paid',
      client_reference_id: nil,
      customer: 'cus_test_123',
      customer_details: customer_details_double,
      customer_email: customer_email
    )
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

        it 'Paymentレコードを1件作成する' do
          user = create(:user, email: customer_email, stripe_customer_id: 'cus_test_123')
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
          end.to change(Payment, :count).by(1)

          payment = Payment.find_by!(stripe_checkout_session_id: 'cs_test_xxx')
          expect(payment.user_id).to eq(user.id)
          expect(payment.stripe_payment_intent_id).to eq('pi_test_123')
          expect(payment.amount).to eq(500)
          expect(payment.currency).to eq('jpy')
          expect(payment.status).to eq('paid')
        end
      end

      context 'checkout.session.completed に必須項目が欠けている場合' do
        let(:session_without_currency) do
          double(
            'StripeSession',
            id: 'cs_test_xxx',
            payment_intent: 'pi_test_123',
            amount_total: 500,
            currency: nil,
            payment_status: 'paid',
            client_reference_id: nil,
            customer: 'cus_test_123',
            customer_details: customer_details_double,
            customer_email: customer_email
          )
        end

        let(:event_data_without_currency) do
          double('StripeEventData', object: session_without_currency)
        end

        let(:stripe_event_missing_currency) do
          double(
            'StripeEvent',
            id: 'evt_test_missing_currency',
            type: 'checkout.session.completed',
            data: event_data_without_currency
          )
        end

        it '500 を返し、Payment も ProcessedWebhookEvent も残さない' do
          create(:user, email: customer_email, stripe_customer_id: 'cus_test_123')
          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_missing_currency)

          expect do
            post '/webhooks/stripe',
              params: payload,
              headers: {
                'Content-Type' => 'application/json',
                'Stripe-Signature' => sig_header,
                'HOST' => 'backend'
              }
          end.not_to change(Payment, :count)

          expect(response).to have_http_status(:internal_server_error)
          expect(ProcessedWebhookEvent.where(stripe_event_id: 'evt_test_missing_currency')).to be_empty
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

      context '同じ stripe_checkout_session_id を2回受信した場合' do
        let(:stripe_event_completed_second) do
          double(
            'StripeEvent',
            id: 'evt_test_duplicate_second',
            type: 'checkout.session.completed',
            data: event_data_double
          )
        end

        it 'Paymentは重複作成されず 1件のまま' do
          create(:user, email: customer_email, stripe_customer_id: 'cus_test_123')
          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_completed, stripe_event_completed_second)

          expect do
            2.times do
              post '/webhooks/stripe',
                params: payload,
                headers: {
                  'Content-Type' => 'application/json',
                  'Stripe-Signature' => sig_header,
                  'HOST' => 'backend'
                }
              expect(response).to have_http_status(:ok)
            end
          end.to change(Payment, :count).by(1)

          expect(Payment.where(stripe_checkout_session_id: 'cs_test_xxx').count).to eq(1)
        end
      end

      context 'ユーザーが見つからない場合' do
        it 'Paymentを作成せず 200 OK を返す' do
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
          end.not_to change(Payment, :count)

          expect(response).to have_http_status(:ok)
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
