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

  # 422のときに機械可読な field/code を返す契約。
  # フロント（frontend/lib/registrationErrors.ts）はこれだけを見て文言を出し分け、
  # 英語のエラーメッセージを文字列解析しない。
  describe 'POST /auth/register の失敗理由（error_codes）' do
    let(:host) { { 'HOST' => 'backend' } }

    def register(params)
      post '/auth/register', params: { user: params }, as: :json, headers: host
    end

    let(:valid_params) do
      {
        email: 'new@example.com',
        username: 'newuser',
        password: 'password123',
        password_confirmation: 'password123'
      }
    end

    it 'メールアドレス重複で email/taken を返す' do
      create(:user, email: 'taken@example.com', username: 'someone')

      register(valid_params.merge(email: 'taken@example.com'))

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error_codes']).to include(
        { 'field' => 'email', 'code' => 'taken' }
      )
    end

    it 'ユーザー名重複で username/taken を返す' do
      create(:user, email: 'other@example.com', username: 'takenname')

      register(valid_params.merge(username: 'takenname'))

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error_codes']).to include(
        { 'field' => 'username', 'code' => 'taken' }
      )
    end

    it 'メールとユーザー名が両方重複していれば両方返す' do
      create(:user, email: 'taken@example.com', username: 'takenname')

      register(valid_params.merge(email: 'taken@example.com', username: 'takenname'))

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error_codes']).to include(
        { 'field' => 'email', 'code' => 'taken' },
        { 'field' => 'username', 'code' => 'taken' }
      )
    end

    it 'パスワードが短ければ password/too_short を返す' do
      register(valid_params.merge(password: 'ab1', password_confirmation: 'ab1'))

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error_codes']).to include(
        { 'field' => 'password', 'code' => 'too_short' }
      )
    end

    it 'パスワードに英数字が足りなければ password/invalid を返す' do
      register(
        valid_params.merge(password: 'abcdefghi', password_confirmation: 'abcdefghi')
      )

      expect(response).to have_http_status(:unprocessable_content)
      expect(json_response['error_codes']).to include(
        { 'field' => 'password', 'code' => 'invalid' }
      )
    end

    it 'error_codes に入力値やパスワードを含めない' do
      create(:user, email: 'taken@example.com', username: 'someone')

      register(valid_params.merge(email: 'taken@example.com'))

      body = response.body
      expect(body).not_to include('password123')
      expect(body).not_to include('taken@example.com')
      # field / code 以外のキーを持たせない
      json_response['error_codes'].each do |entry|
        expect(entry.keys).to match_array(%w[field code])
      end
    end
  end
end
