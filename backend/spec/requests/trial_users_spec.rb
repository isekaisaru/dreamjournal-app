require 'rails_helper'

RSpec.describe 'Trial Users API', type: :request do
  describe 'POST /auth/trial_login' do
    let(:trial_params) do
      {
        trial_user: {
          email: 'trial_example@example.com',
          username: 'trial_example',
          password: 'trial_password_123',
          password_confirmation: 'trial_password_123'
        }
      }
    end

    it 'トライアルユーザーを作成し、レスポンスに trial 判定項目を含む' do
      post '/auth/trial_login', params: trial_params, as: :json, headers: { 'HOST' => 'backend' }

      expect(response).to have_http_status(:created)

      user = json_response['user']
      expect(user['trial_user']).to be true
      expect(user['trial_analysis_count']).to eq(0)
      expect(user['trial_audio_count']).to eq(0)

      # Cookieが設定される（registered userと同じ authenticated user 扱い）
      expect(response.cookies['access_token']).to be_present
      expect(response.cookies['refresh_token']).to be_present
    end

    it 'self プロフィールが自動作成される' do
      post '/auth/trial_login', params: trial_params, as: :json, headers: { 'HOST' => 'backend' }

      created = User.find_by(email: 'trial_example@example.com')
      expect(created.dream_profiles.where(relationship: 'self').count).to eq(1)
    end
  end
end
