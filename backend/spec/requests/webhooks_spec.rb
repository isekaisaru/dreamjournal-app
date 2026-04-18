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
      mode: 'payment',
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
            mode: 'payment',
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

      context 'subscription checkout の場合' do
        let(:subscription_session_double) do
          double(
            'StripeSubscriptionSession',
            id: 'cs_sub_test_xxx',
            mode: 'subscription',
            subscription: 'sub_test_123',
            customer: 'cus_test_123',
            client_reference_id: nil,
            customer_details: customer_details_double,
            customer_email: customer_email
          )
        end

        let(:subscription_event_data_double) do
          double('StripeEventData', object: subscription_session_double)
        end

        let(:stripe_subscription_event) do
          double(
            'StripeEvent',
            id: 'evt_subscription_started',
            type: 'checkout.session.completed',
            data: subscription_event_data_double
          )
        end

        it 'Subscription を作成し、ユーザーを premium にする' do
          user = create(:user, email: customer_email, stripe_customer_id: 'cus_test_123')
          allow(Stripe::Webhook).to receive(:construct_event).and_return(stripe_subscription_event)

          expect do
            post '/webhooks/stripe',
              params: payload,
              headers: {
                'Content-Type' => 'application/json',
                'Stripe-Signature' => sig_header,
                'HOST' => 'backend'
              }
          end.to change(Subscription, :count).by(1)

          expect(response).to have_http_status(:ok)
          expect(user.reload.premium).to be true
          expect(Subscription.find_by!(stripe_subscription_id: 'sub_test_123').status).to eq('active')
        end
      end

      context 'invoice.payment_succeeded の場合' do
        let(:period_end) { 1.month.from_now.to_i }
        let(:period_double) { double('StripePeriod', end: period_end) }
        let(:line_double) { double('StripeInvoiceLine', period: period_double) }
        let(:lines_double) { double('StripeLines', data: [line_double]) }
        let(:invoice_double) do
          double(
            'StripeInvoice',
            subscription: 'sub_test_renewal',
            customer: 'cus_test_123',
            lines: lines_double
          )
        end
        let(:invoice_event_data_double) { double('StripeEventData', object: invoice_double) }
        let(:invoice_event) do
          double(
            'StripeEvent',
            id: 'evt_invoice_paid',
            type: 'invoice.payment_succeeded',
            data: invoice_event_data_double
          )
        end

        it 'subscription を active に保ち、premium を維持する' do
          user = create(:user, stripe_customer_id: 'cus_test_123', premium: false)
          subscription = create(
            :subscription,
            user: user,
            stripe_subscription_id: 'sub_test_renewal',
            stripe_customer_id: 'cus_test_123',
            status: 'past_due',
            current_period_end: nil
          )
          allow(Stripe::Webhook).to receive(:construct_event).and_return(invoice_event)

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(response).to have_http_status(:ok)
          expect(subscription.reload.status).to eq('active')
          expect(subscription.current_period_end.to_i).to eq(period_end)
          expect(user.reload.premium).to be true
        end

        it 'subscription が未作成でも customer から user を解決して作成する' do
          user = create(:user, stripe_customer_id: 'cus_test_123', premium: false)
          allow(Stripe::Webhook).to receive(:construct_event).and_return(invoice_event)

          expect do
            post '/webhooks/stripe',
              params: payload,
              headers: {
                'Content-Type' => 'application/json',
                'Stripe-Signature' => sig_header,
                'HOST' => 'backend'
              }
          end.to change(Subscription, :count).by(1)

          subscription = Subscription.find_by!(stripe_subscription_id: 'sub_test_renewal')
          expect(response).to have_http_status(:ok)
          expect(subscription.user_id).to eq(user.id)
          expect(subscription.status).to eq('active')
          expect(subscription.current_period_end.to_i).to eq(period_end)
          expect(user.reload.premium).to be true
        end
      end

      context 'customer.subscription.deleted の場合' do
        let(:subscription_object_double) do
          double(
            'StripeSubscription',
            id: 'sub_test_cancelled',
            status: 'canceled',
            current_period_end: nil
          )
        end
        let(:subscription_deleted_event_data_double) do
          double('StripeEventData', object: subscription_object_double)
        end
        let(:subscription_deleted_event) do
          double(
            'StripeEvent',
            id: 'evt_subscription_deleted',
            type: 'customer.subscription.deleted',
            data: subscription_deleted_event_data_double
          )
        end

        it 'subscription を canceled にし、premium を外す' do
          user = create(:user, premium: true)
          subscription = create(
            :subscription,
            user: user,
            stripe_subscription_id: 'sub_test_cancelled',
            stripe_customer_id: 'cus_cancel_123',
            status: 'active'
          )
          allow(Stripe::Webhook).to receive(:construct_event).and_return(subscription_deleted_event)

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(response).to have_http_status(:ok)
          expect(subscription.reload.status).to eq('canceled')
          expect(user.reload.premium).to be false
        end

        it '他に有効な subscription が残っている場合は premium を維持する' do
          user = create(:user, premium: true)
          canceled_subscription = create(
            :subscription,
            user: user,
            stripe_subscription_id: 'sub_test_cancelled',
            stripe_customer_id: 'cus_cancel_123',
            status: 'active'
          )
          create(
            :subscription,
            user: user,
            stripe_subscription_id: 'sub_test_still_active',
            stripe_customer_id: 'cus_cancel_123',
            status: 'active'
          )
          allow(Stripe::Webhook).to receive(:construct_event).and_return(subscription_deleted_event)

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(response).to have_http_status(:ok)
          expect(canceled_subscription.reload.status).to eq('canceled')
          expect(user.reload.premium).to be true
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

      context 'checkout.session.completed (mode=subscription) の場合' do
        let(:subscription_session_double) do
          double(
            'StripeSubscriptionSession',
            id: 'cs_sub_test_xxx',
            mode: 'subscription',
            subscription: 'sub_test_123',
            client_reference_id: nil,
            customer: 'cus_test_123',
            customer_details: customer_details_double,
            customer_email: customer_email
          )
        end

        let(:subscription_event_data) do
          double('StripeEventData', object: subscription_session_double)
        end

        let(:stripe_event_subscription_completed) do
          double(
            'StripeEvent',
            id: 'evt_sub_completed',
            type: 'checkout.session.completed',
            data: subscription_event_data
          )
        end

        it '200 OK を返す' do
          create(:user, email: customer_email, stripe_customer_id: 'cus_test_123')
          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_subscription_completed)

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(response).to have_http_status(:ok)
        end

        it 'Subscription レコードを作成し、users.premium が true になる' do
          user = create(:user, email: customer_email, stripe_customer_id: 'cus_test_123', premium: false)
          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_subscription_completed)

          expect do
            post '/webhooks/stripe',
              params: payload,
              headers: {
                'Content-Type' => 'application/json',
                'Stripe-Signature' => sig_header,
                'HOST' => 'backend'
              }
          end.to change(Subscription, :count).by(1)

          subscription = Subscription.find_by!(stripe_subscription_id: 'sub_test_123')
          expect(subscription.user_id).to eq(user.id)
          expect(subscription.status).to eq('active')
          expect(user.reload.premium).to be true
        end

        it '同じ stripe_subscription_id を2回受信しても Subscription は1件のまま' do
          create(:user, email: customer_email, stripe_customer_id: 'cus_test_123')

          second_event = double(
            'StripeEvent',
            id: 'evt_sub_completed_2',
            type: 'checkout.session.completed',
            data: subscription_event_data
          )

          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_subscription_completed, second_event)

          expect do
            2.times do
              post '/webhooks/stripe',
                params: payload,
                headers: {
                  'Content-Type' => 'application/json',
                  'Stripe-Signature' => sig_header,
                  'HOST' => 'backend'
                }
            end
          end.to change(Subscription, :count).by(1)
        end
      end

      context 'invoice.payment_succeeded の場合' do
        let(:period_end) { 1_800_000_000 }
        let(:period_double) { double('StripePeriod', end: period_end) }
        let(:line_double) { double('StripeInvoiceLine', period: period_double) }
        let(:lines_double) { double('StripeLines', data: [line_double]) }
        let(:invoice_double) do
          double(
            'StripeInvoice',
            subscription: 'sub_test_123',
            customer: 'cus_test_123',
            lines: lines_double
          )
        end

        let(:invoice_event_data) { double('StripeEventData', object: invoice_double) }

        let(:stripe_event_invoice_paid) do
          double(
            'StripeEvent',
            id: 'evt_invoice_paid',
            type: 'invoice.payment_succeeded',
            data: invoice_event_data
          )
        end

        it '200 OK を返す' do
          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_invoice_paid)

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(response).to have_http_status(:ok)
        end

        it '対応する Subscription の current_period_end を更新する' do
          user = create(:user, email: customer_email, stripe_customer_id: 'cus_test_123')
          subscription = create(:subscription, user: user, stripe_subscription_id: 'sub_test_123', stripe_customer_id: 'cus_test_123', status: 'active')

          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_invoice_paid)

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(subscription.reload.current_period_end.to_i).to eq(period_end)
        end
      end

      context 'customer.subscription.deleted の場合' do
        let(:stripe_sub_double) do
          double('StripeSubscription', id: 'sub_test_123')
        end

        let(:deletion_event_data) { double('StripeEventData', object: stripe_sub_double) }

        let(:stripe_event_sub_deleted) do
          double(
            'StripeEvent',
            id: 'evt_sub_deleted',
            type: 'customer.subscription.deleted',
            data: deletion_event_data
          )
        end

        it '200 OK を返す' do
          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_sub_deleted)

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(response).to have_http_status(:ok)
        end

        it 'Subscription.status が canceled になり users.premium が false になる' do
          user = create(:user, email: customer_email, stripe_customer_id: 'cus_test_123', premium: true)
          subscription = create(:subscription, user: user, stripe_subscription_id: 'sub_test_123', stripe_customer_id: 'cus_test_123', status: 'active')

          allow(Stripe::Webhook).to receive(:construct_event)
            .and_return(stripe_event_sub_deleted)

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(subscription.reload.status).to eq('canceled')
          expect(user.reload.premium).to be false
        end

        it '他に有効な subscription があれば premium を維持する' do
          user = create(:user, email: customer_email, stripe_customer_id: 'cus_test_123', premium: true)
          create(
            :subscription,
            user: user,
            stripe_subscription_id: 'sub_test_other_active',
            stripe_customer_id: 'cus_test_123',
            status: 'past_due'
          )
          canceled_subscription = create(
            :subscription,
            user: user,
            stripe_subscription_id: 'sub_test_123',
            stripe_customer_id: 'cus_test_123',
            status: 'active'
          )
          allow(Stripe::Webhook).to receive(:construct_event).and_return(stripe_event_sub_deleted)

          post '/webhooks/stripe',
            params: payload,
            headers: {
              'Content-Type' => 'application/json',
              'Stripe-Signature' => sig_header,
              'HOST' => 'backend'
            }

          expect(response).to have_http_status(:ok)
          expect(canceled_subscription.reload.status).to eq('canceled')
          expect(user.reload.premium).to be true
        end
      end
    end
  end
end
