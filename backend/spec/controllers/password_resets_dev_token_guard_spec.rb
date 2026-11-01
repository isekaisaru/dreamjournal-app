# frozen_string_literal: true

require 'rails_helper'

# PasswordResetsController#dev_token の「コントローラー側ガード」を単体で固定するテスト。
# routes.rb のガードが外れる/誤って登録されても、本番ではトークンを返さない（二重防御）。
RSpec.describe PasswordResetsController, type: :controller do
  # test環境ではルートが未登録のため、使い捨てのRouteSetでアクションを直接呼ぶ（本物のルート表は触らない）
  routes do
    ActionDispatch::Routing::RouteSet.new.tap do |set|
      set.draw { get '/dev/password_resets/token', to: 'password_resets#dev_token' }
    end
  end

  let!(:user) { create(:user, email: 'dev-token-guard@example.com') }

  def stub_env(env_name:, enable_value:)
    allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new(env_name))
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ENABLE_DEV_ENDPOINTS').and_return(enable_value)
  end

  shared_examples '開発用トークンを返さない' do
    it '403 を返し、トークンを発行も返却もしない' do
      expect { get :dev_token, params: { email: user.email } }
        .not_to(change { user.reload.reset_password_token_digest })

      expect(response).to have_http_status(:forbidden)
      expect(response.body).not_to include('"token"')
    end
  end

  context 'production + ENABLE_DEV_ENDPOINTS=true（最重要）' do
    before { stub_env(env_name: 'production', enable_value: 'true') }
    it_behaves_like '開発用トークンを返さない'
  end

  context 'production + 未設定' do
    before { stub_env(env_name: 'production', enable_value: nil) }
    it_behaves_like '開発用トークンを返さない'
  end

  context 'staging 等の未知の環境 + ENABLE_DEV_ENDPOINTS=true' do
    before { stub_env(env_name: 'staging', enable_value: 'true') }
    it_behaves_like '開発用トークンを返さない'
  end

  context 'test + 未設定' do
    before { stub_env(env_name: 'test', enable_value: nil) }
    it_behaves_like '開発用トークンを返さない'
  end

  # 対照実験: ガードが常に403を返すだけの実装でも上が通ってしまうため、許可側も固定する
  context 'development（既存動作の維持）' do
    before { stub_env(env_name: 'development', enable_value: nil) }

    it '200 とトークンを返す' do
      get :dev_token, params: { email: user.email }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)['token']).to be_present
    end
  end

  context 'test + ENABLE_DEV_ENDPOINTS=true（E2E用の既存動作）' do
    before { stub_env(env_name: 'test', enable_value: 'true') }

    it '200 とトークンを返す' do
      get :dev_token, params: { email: user.email }

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)['token']).to be_present
    end
  end
end
