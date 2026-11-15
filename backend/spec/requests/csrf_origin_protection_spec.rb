require 'rails_helper'

# Rails APIモード（ActionController::API）はCSRF保護がデフォルトで無効なため、
# 状態変更系リクエストのOrigin（無ければReferer）検証で代替している
# （ApplicationController#verify_request_origin!）。
#
# 8月スプリント計画のCodex監査で発見：CORSはcredentials: trueかつ許可オリジン限定だが、
# 「レスポンスをJSから読めない」ことしか保証せず、「副作用が起きること」自体は防げない。
# 本番はSameSite=NoneのCookie認証のため、悪意あるサイトからの単純なフォーム送信が
# 理論上のCSRFになりうる、という指摘への対応。
RSpec.describe 'CSRFのOrigin検証（状態変更系リクエスト）', type: :request do
  let!(:user) { create(:user, :with_self_profile) }
  let(:allowed_origin) { 'http://localhost:3000' }
  let(:forged_origin)  { 'https://evil.example.com' }

  describe '偽装Originからの状態変更リクエストを拒否する' do
    it 'POSTを403で拒否する（例: /dreams）' do
      expect {
        authenticated_post_with_origin('/dreams', user, forged_origin,
                                        params: { dream: { title: 't', content: 'c' } })
      }.not_to change(Dream, :count)

      expect(response).to have_http_status(:forbidden)
      expect(json_response['error']).to be_present
    end

    it 'PATCHを403で拒否する（例: /auth/me）' do
      authenticated_patch_with_origin('/auth/me', user, forged_origin,
                                       params: { user: { username: 'renamed' } })

      expect(response).to have_http_status(:forbidden)
      expect(user.reload.username).not_to eq('renamed')
    end

    it 'DELETEを403で拒否する（例: /dreams/:id）' do
      dream = create(:dream, user: user)

      expect {
        delete "/dreams/#{dream.id}",
               headers: { 'HOST' => 'backend', 'Origin' => forged_origin, 'Cookie' => "access_token=#{login_token_for(user)}" }
      }.not_to change(Dream, :count)

      expect(response).to have_http_status(:forbidden)
    end

    it 'Originが無くても、許可されていないRefererなら拒否する' do
      # spec/support/default_origin_header.rb が既定Originを補うため、
      # 「Originが無い」状況を再現するために明示的にnilで上書きする。
      post '/dreams',
           params: { dream: { title: 't', content: 'c' } },
           as: :json,
           headers: {
             'HOST' => 'backend',
             'Origin' => nil,
             'Referer' => 'https://evil.example.com/attack.html',
             'Cookie' => "access_token=#{login_token_for(user)}"
           }

      expect(response).to have_http_status(:forbidden)
    end

    it 'OriginもRefererも無い状態変更リクエストは拒否する' do
      post '/dreams',
           params: { dream: { title: 't', content: 'c' } },
           as: :json,
           headers: { 'HOST' => 'backend', 'Origin' => nil, 'Cookie' => "access_token=#{login_token_for(user)}" }

      expect(response).to have_http_status(:forbidden)
    end

    it '認証が必要なアクションに限らず、未認証の公開POST（/auth/login）も拒否する' do
      post '/auth/login',
           params: { email: user.email, password: 'password123' },
           as: :json,
           headers: { 'HOST' => 'backend', 'Origin' => forged_origin }

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe '許可されたOriginからは通常どおり動作する（回帰確認）' do
    it 'GETはOriginチェックの対象外（そもそも状態を変えない）' do
      get '/dreams', headers: { 'HOST' => 'backend', 'Cookie' => "access_token=#{login_token_for(user)}" }

      expect(response).to have_http_status(:ok)
    end

    it '許可Originからのpostは通常どおり成功する' do
      expect {
        authenticated_post_with_origin('/dreams', user, allowed_origin,
                                        params: { dream: { title: 't', content: 'c' } })
      }.to change(Dream, :count).by(1)

      expect(response).to have_http_status(:created)
    end
  end

  describe 'Stripe Webhookは対象外（サーバー間通信でOriginを送らないため）' do
    it 'Originヘッダーが無くても、Origin検証では拒否されない（署名検証で別途弾かれる）' do
      post '/webhooks/stripe', params: '{}', headers: { 'HOST' => 'backend', 'Content-Type' => 'application/json' }

      # STRIPE_WEBHOOK_SECRET未設定 or 署名不一致で失敗するが、
      # 少なくとも「Origin検証由来の403」ではないことを確認する
      expect(response).not_to have_http_status(:forbidden)
    end
  end

  private

  def login_token_for(user)
    post '/auth/login',
         params: { email: user.email, password: 'password123' },
         as: :json,
         headers: { 'HOST' => 'backend', 'Origin' => allowed_origin }
    response.cookies['access_token']
  end

  def authenticated_post_with_origin(path, user, origin, params:)
    post path, params: params, as: :json,
               headers: { 'HOST' => 'backend', 'Origin' => origin, 'Cookie' => "access_token=#{login_token_for(user)}" }
  end

  def authenticated_patch_with_origin(path, user, origin, params:)
    patch path, params: params, as: :json,
                headers: { 'HOST' => 'backend', 'Origin' => origin, 'Cookie' => "access_token=#{login_token_for(user)}" }
  end
end
