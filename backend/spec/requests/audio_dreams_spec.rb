require 'rails_helper'

RSpec.describe 'AudioDreams API', type: :request do
  let!(:user) { create(:user) }

  describe 'POST /analyze_audio_dream' do
    context '認証済みユーザーの場合' do
      it 'トライアルの永続カウンタ上限に達している場合は403を返す' do
        user.update!(trial_user: true, trial_audio_count: 1)

        authenticated_post '/analyze_audio_dream', user

        expect(response).to have_http_status(:forbidden)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :post, '/analyze_audio_dream'
    end
  end
end
