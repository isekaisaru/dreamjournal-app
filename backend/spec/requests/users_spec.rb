require 'rails_helper'

RSpec.describe 'Users API', type: :request do
  describe 'DELETE /users/:id' do
    it_behaves_like 'unauthorized request', :delete, '/users/0'

    context 'active サブスクがあり、Stripe 解約に成功する場合' do
      it 'ユーザーを削除し 200 を返す' do
        user = create(:user)
        create(:subscription, user: user, stripe_subscription_id: 'sub_ok_1', status: 'active')

        expect(Stripe::Subscription).to receive(:cancel).with('sub_ok_1')

        authenticated_delete("/users/#{user.id}", user)

        expect(response).to have_http_status(:ok)
        expect(User.exists?(user.id)).to be false
      end
    end

    context 'Stripe 解約に失敗する場合' do
      it 'ユーザーを削除せず 422 を返す' do
        user = create(:user)
        create(:subscription, user: user, stripe_subscription_id: 'sub_ng_1', status: 'active')

        allow(Stripe::Subscription).to receive(:cancel).and_raise(
          Stripe::APIConnectionError.new('connection failed')
        )

        authenticated_delete("/users/#{user.id}", user)

        expect(response).to have_http_status(:unprocessable_content)
        expect(JSON.parse(response.body)['error']).to include('解約に失敗')
        expect(User.exists?(user.id)).to be true
      end
    end

    context '解約成功後に destroy が失敗する場合' do
      it '既存の false 分岐に入り、ユーザーは残り 401 を返す' do
        user = create(:user)
        create(:subscription, user: user, stripe_subscription_id: 'sub_dfail_1', status: 'active')

        allow(Stripe::Subscription).to receive(:cancel).with('sub_dfail_1')
        allow_any_instance_of(User).to receive(:destroy).and_return(false)

        authenticated_delete("/users/#{user.id}", user)

        expect(response).to have_http_status(:unauthorized)
        expect(User.exists?(user.id)).to be true
      end
    end

    context 'サブスクが無い場合' do
      it 'Stripe を呼ばずにユーザーを削除し 200 を返す' do
        user = create(:user)

        expect(Stripe::Subscription).not_to receive(:cancel)

        authenticated_delete("/users/#{user.id}", user)

        expect(response).to have_http_status(:ok)
        expect(User.exists?(user.id)).to be false
      end
    end
  end
end
