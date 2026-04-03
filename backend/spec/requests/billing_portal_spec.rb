require 'rails_helper'

RSpec.describe 'BillingPortal API', type: :request do
  let(:frontend_url) { 'http://localhost:3000' }
  let(:portal_url) { 'https://billing.stripe.com/session/test_portal_123' }

  before do
    stub_const('ENV', ENV.to_hash.merge('FRONTEND_URL' => frontend_url))
  end

  describe 'POST /billing_portal' do
    it_behaves_like 'unauthorized request', :post, '/billing_portal'

    context 'stripe_customer_id がある場合' do
      it 'ポータルURLを返す' do
        user = create(:user, stripe_customer_id: 'cus_test_123')
        portal_session = double('Stripe::BillingPortal::Session', url: portal_url)

        expect(Stripe::BillingPortal::Session).to receive(:create).with(
          customer: 'cus_test_123',
          return_url: "#{frontend_url}/subscription"
        ).and_return(portal_session)

        authenticated_post('/billing_portal', user)

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['url']).to eq(portal_url)
      end
    end

    context 'stripe_customer_id がない場合' do
      it '422 を返す' do
        user = create(:user, stripe_customer_id: nil)

        expect(Stripe::BillingPortal::Session).not_to receive(:create)

        authenticated_post('/billing_portal', user)

        expect(response).to have_http_status(:unprocessable_content)
        expect(JSON.parse(response.body)['error']).to include('Stripe顧客情報が見つかりません')
      end
    end

    context 'FRONTEND_URL が未設定の場合' do
      it '500 を返す' do
        stub_const('ENV', ENV.to_hash.merge('FRONTEND_URL' => nil))
        user = create(:user, stripe_customer_id: 'cus_test_123')

        expect(Stripe::BillingPortal::Session).not_to receive(:create)

        authenticated_post('/billing_portal', user)

        expect(response).to have_http_status(:internal_server_error)
      end
    end

    context 'Stripe がエラーを返す場合' do
      it '500 を返す' do
        user = create(:user, stripe_customer_id: 'cus_test_123')

        allow(Stripe::BillingPortal::Session).to receive(:create).and_raise(
          Stripe::StripeError.new('invalid customer')
        )

        authenticated_post('/billing_portal', user)

        expect(response).to have_http_status(:internal_server_error)
        expect(JSON.parse(response.body)['error']).to include('失敗しました')
      end
    end
  end
end
