require 'rails_helper'
require 'tempfile'

RSpec.describe 'AudioDreams API', type: :request do
  let!(:user) { create(:user) }
  let(:audio_tempfile) do
    file = Tempfile.new(['audio', '.webm'])
    file.binmode
    file.write('fake webm audio for request specs')
    file.rewind
    file
  end

  around do |example|
    original_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    example.run
  ensure
    ActiveJob::Base.queue_adapter = original_adapter
  end

  after do
    audio_tempfile.close!
  end

  def audio_upload
    audio_tempfile.rewind
    Rack::Test::UploadedFile.new(audio_tempfile.path, 'audio/webm')
  end

  describe 'POST /analyze_audio_dream' do
    context '認証済みユーザーの場合' do
      it '自分のユーザーに紐づく音声夢を作成する' do
        expect {
          post '/analyze_audio_dream',
               params: { file: audio_upload },
               headers: auth_headers(user)
        }.to change { user.dreams.count }.by(1)

        expect(response).to have_http_status(:ok)

        dream = user.dreams.order(:created_at).last
        expect(dream.title).to include('音声記録')
        expect(dream.content).to eq('音声解析中...')
        expect(dream.analysis_status).to eq('pending')
      end

      it 'トライアルの永続カウンタ上限に達している場合は403を返す' do
        user.update!(trial_user: true, trial_audio_count: 1)

        authenticated_post '/analyze_audio_dream', user

        expect(response).to have_http_status(:forbidden)
      end

      it 'プレミアム会員はtrial_audio_countが上限に達していても403を返さない' do
        user.update!(premium: true, trial_user: true, trial_audio_count: 1)

        authenticated_post '/analyze_audio_dream', user

        expect(response).not_to have_http_status(:forbidden)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :post, '/analyze_audio_dream'

      it 'User.firstに音声夢を作成しない' do
        first_user = user

        expect {
          post '/analyze_audio_dream',
               params: { file: audio_upload },
               headers: { 'HOST' => 'backend' }
        }.not_to change(Dream, :count)

        expect(response).to have_http_status(:unauthorized)
        expect(first_user.dreams.reload).to be_empty
      end
    end
  end
end
