require 'rails_helper'

RSpec.describe 'Authentication API', type: :request do
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
        post '/auth/login', params: valid_credentials, as: :json, headers: { 'HOST' => 'backend' }
        
        # ステータスコード確認
        expect(response).to have_http_status(:ok)
        
        # レスポンスボディ確認
        # json_response ヘルパーを利用
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
        post '/auth/login', params: invalid_credentials, as: :json, headers: { 'HOST' => 'backend' }
        
        # ステータスコード確認
        expect(response).to have_http_status(:unauthorized)
        
        # レスポンスボディ確認
        # json_response ヘルパーを利用
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
        }, as: :json, headers: { 'HOST' => 'backend' }
        
        expect(response).to have_http_status(:unauthorized)
        
        # json_response ヘルパーを利用
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
        # json_response ヘルパーを利用
        expect(json_response).to have_key('user')
        expect(json_response['user']['id']).to eq(user.id)
        expect(json_response['user']['email']).to eq(user.email)
        expect(json_response['user']['username']).to eq(user.username)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :get, '/auth/me'
    end

    context '無効なトークンの場合' do
      it '401エラーを返す' do
        get '/auth/me', headers: { 'Cookie' => 'access_token=invalid.token.here', 'HOST' => 'backend' }
        
        expect(response).to have_http_status(:unauthorized)
        
        # json_response ヘルパーを利用
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
        
        # json_response ヘルパーを利用
        expect(json_response['authenticated']).to be true
        expect(json_response).to have_key('user')
        expect(json_response['user']['email']).to eq(user.email)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :get, '/auth/verify'
    end
  end

  describe 'POST /auth/logout' do
    context '認証済みユーザーの場合' do
      it 'ログアウトが成功し、Cookieが削除される' do
        # 認証ヘルパーでログイン状態をセットアップ。メソッド名を修正。
        login_user(user)
        
        post '/auth/logout', as: :json, headers: { 'HOST' => 'backend' }
        
        expect(response).to have_http_status(:ok)
        
        # json_response ヘルパーを利用
        expect(json_response['message']).to include('ログアウト')

        # Cookieが実際に削除されたことを確認
        expect(response.cookies['access_token']).to be_blank
        expect(response.cookies['refresh_token']).to be_blank
      end
    end
  end

  describe 'POST /auth/register' do
    let(:valid_user_params) do
      {
        user: {
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
          password_confirmation: 'password123'
        }
      }
    end

    context '有効なパラメータの場合' do
      it 'ユーザーを作成し、201 Createdを返す' do
        expect {
          post '/auth/register', params: valid_user_params, as: :json, headers: { 'HOST' => 'backend' }
        }.to change(User, :count).by(1)

        expect(response).to have_http_status(:created)
        expect(json_response['user']['email']).to eq('newuser@example.com')
        expect(response.cookies['access_token']).to be_present
      end
    end

    context '無効なパラメータの場合' do
      let!(:existing_user) { create(:user, email: 'taken@example.com') }

      it '重複したメールアドレスの場合、422を返す' do
        duplicate_params = valid_user_params.deep_merge(user: { email: 'taken@example.com' })
        expect {
          post '/auth/register', params: duplicate_params, as: :json, headers: { 'HOST' => 'backend' }
        }.not_to change(User, :count)

        expect(response).to have_http_status(:unprocessable_content)
        expect(json_response['error']).to include('Email has already been taken')
      end

      it 'パスワードが短すぎる場合、422を返す' do
        short_password_params = valid_user_params.deep_merge(user: { password: '123', password_confirmation: '123' })
        expect {
          post '/auth/register', params: short_password_params, as: :json, headers: { 'HOST' => 'backend' }
        }.not_to change(User, :count)

        expect(response).to have_http_status(:unprocessable_content)
        expect(json_response['error']).to include('Password is too short (minimum is 6 characters)')
      end

      it 'パスワード確認が一致しない場合、422を返す' do
        mismatched_password_params = valid_user_params.deep_merge(user: { password_confirmation: 'wrong_confirmation' })
        expect {
          post '/auth/register', params: mismatched_password_params, as: :json, headers: { 'HOST' => 'backend' }
        }.not_to change(User, :count)

        expect(response).to have_http_status(:unprocessable_content)
        expect(json_response['error']).to include("Password confirmation doesn't match Password")
      end

      it 'パスワードが空の場合、422を返す' do
        # 他のテストと干渉しないように、新しいメールアドレスを使用
        missing_password_params = valid_user_params.deep_merge(user: { email: 'anothernewuser@example.com', password: '', password_confirmation: '' })
        expect {
          post '/auth/register', params: missing_password_params, as: :json, headers: { 'HOST' => 'backend' }
        }.not_to change(User, :count)

        expect(response).to have_http_status(:unprocessable_content)
        expect(json_response['error']).to include("Password can't be blank")
      end

      it 'ユーザー名が空の場合、422を返す' do
        missing_username_params = valid_user_params.deep_merge(user: { username: '' })
        expect {
          post '/auth/register', params: missing_username_params, as: :json, headers: { 'HOST' => 'backend' }
        }.not_to change(User, :count)

        expect(response).to have_http_status(:unprocessable_content)
        expect(json_response['error']).to include("Username can't be blank")
      end
    end
  end
end