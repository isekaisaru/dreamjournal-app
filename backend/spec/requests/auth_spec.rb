require 'rails_helper'

RSpec.describe 'Authentication API', type: :request do
  # テスト前にデータベースをクリーンアップ
  before(:each) do
    User.destroy_all
  end
  
  # FactoryBotを使用してテスト用のユーザーを作成
  let!(:user) { create(:user, email: 'test@example.com', username: 'testuser', password: 'password123') }
  
  let(:valid_credentials) do
    {
      # ハードコーディングを避け、letで定義したuserオブジェクトを利用
      email: user.email,
      password: 'password123'
    }
  end
  
  let(:invalid_credentials) do
    {
      email: user.email,
      password: 'wrongpassword'
    }
  end

  describe 'POST /auth/login' do
    context '正しい認証情報の場合' do
      it 'ログインが成功し、Cookieが設定される' do
        post '/auth/login', params: valid_credentials, headers: { 'Content-Type' => 'application/json', 'HOST' => 'backend' }
        
        # ステータスコード確認
        expect(response).to have_http_status(:ok)
        
        # レスポンスボディ確認
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('user')
        expect(json_response['user']['email']).to eq(user.email)
        expect(json_response['user']['username']).to eq(user.username)
        
        # Cookie設定確認
        expect(response.cookies['access_token']).to be_present
        expect(response.cookies['refresh_token']).to be_present
        
        # JWT トークンの形式確認（base64でエンコードされたJWT）
        access_token = response.cookies['access_token']
        expect(access_token).to match(/\A[\w-]+\.[\w-]+\.[\w-]+\z/)
      end
    end

    context '間違った認証情報の場合' do
      it 'ログインが失敗し、Cookieが設定されない' do
        post '/auth/login', params: invalid_credentials, headers: { 'HOST' => 'backend' }
        
        # ステータスコード確認
        expect(response).to have_http_status(:unauthorized)
        
        # レスポンスボディ確認
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('error')
        expect(json_response['error']).to be_present
        
        # Cookie設定されていないことを確認
        expect(response.cookies['access_token']).to be_blank
        expect(response.cookies['refresh_token']).to be_blank
      end
    end

    context 'メールアドレスが存在しない場合' do
      it 'ログインが失敗する' do
        post '/auth/login', params: {
          email: 'nonexistent@example.com',
          password: 'password123'
        }, headers: { 'HOST' => 'backend' }
        
        expect(response).to have_http_status(:unauthorized)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('error')
      end
    end
  end

  describe 'GET /auth/me' do
    context '認証済みユーザーの場合' do
      it 'ユーザー情報を返す' do
        # 認証ヘルパーを使用して、ログインとCookie設定を簡潔に
        authenticated_get('/auth/me', user)
        
        expect(response).to have_http_status(:ok)
        
        # レスポンスボディ確認
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('user')
        expect(json_response['user']['id']).to eq(user.id)
        expect(json_response['user']['email']).to eq(user.email)
        expect(json_response['user']['username']).to eq(user.username)
      end
    end

    context '認証されていない場合' do
      it '401エラーを返す' do
        get '/auth/me', headers: { 'HOST' => 'backend' }
        
        expect(response).to have_http_status(:unauthorized)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('error')
        expect(json_response['error']).to include('認証')
      end
    end

    context '無効なトークンの場合' do
      it '401エラーを返す' do
        get '/auth/me', headers: { 'Cookie' => 'access_token=invalid.token.here', 'HOST' => 'backend' }
        
        expect(response).to have_http_status(:unauthorized)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('error')
      end
    end
  end

  describe 'GET /auth/verify' do
    context '認証済みユーザーの場合' do
      it '認証情報を返す' do
        # 認証ヘルパーを使用
        authenticated_get('/auth/verify', user)
        
        expect(response).to have_http_status(:ok)
        
        json_response = JSON.parse(response.body)
        expect(json_response['authenticated']).to be true
        expect(json_response).to have_key('user')
        expect(json_response['user']['email']).to eq(user.email)
      end
    end

    context '認証されていない場合' do
      it '401エラーを返す' do
        get '/auth/verify'
        
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'POST /auth/logout' do
    context '認証済みユーザーの場合' do
      it 'ログアウトが成功し、Cookieが削除される' do
        # 認証ヘルパーでログイン状態をセットアップ
        login(user)
        
        post '/auth/logout'
        
        expect(response).to have_http_status(:ok)
        
        json_response = JSON.parse(response.body)
        expect(json_response['message']).to include('ログアウト')
      end
    end
  end
end