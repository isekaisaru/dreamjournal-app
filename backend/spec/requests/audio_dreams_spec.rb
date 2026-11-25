require 'rails_helper'
require 'tempfile'

RSpec.describe 'AudioDreams API', type: :request do
  include ActiveSupport::Testing::TimeHelpers

  let!(:user) { create(:user, :with_self_profile) }
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

      it '仮の題名の日時は日本時間で付ける（サーバーの時刻は UTC）' do
        travel_to Time.utc(2026, 11, 16, 20, 49) do
          post '/analyze_audio_dream', params: { file: audio_upload }, headers: auth_headers(user)
        end

        expect(response).to have_http_status(:ok)
        expect(user.dreams.order(:created_at).last.title).to eq('音声記録 2026/11/17 05:49')
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

      it 'トライアルの上限メッセージは「無制限」と言わず、無料プランの月の回数を案内する' do
        user.update!(trial_user: true, trial_audio_count: 1)

        authenticated_post '/analyze_audio_dream', user

        expect(json_response['error']).to include("月#{AudioDreamsController::FREE_AUDIO_MONTHLY_LIMIT}回")
        expect(json_response['error']).not_to include('無制限')
      end
    end

    context '無料プラン（本登録・非プレミアム）の月の上限' do
      let(:limit) { AudioDreamsController::FREE_AUDIO_MONTHLY_LIMIT }

      def audio_usage_count(target)
        AiUsageLog.where(user: target, feature: 'audio_analysis').count
      end

      it '上限内なら音声夢を作り、利用ログを1件残す' do
        create_list(:ai_usage_log, limit - 1, user: user, feature: 'audio_analysis')

        expect {
          post '/analyze_audio_dream',
               params: { file: audio_upload },
               headers: auth_headers(user)
        }.to change { audio_usage_count(user) }.by(1)

        expect(response).to have_http_status(:ok)
      end

      it '今月の上限に達していたら403で、夢もジョブも利用ログも増えない' do
        create_list(:ai_usage_log, limit, user: user, feature: 'audio_analysis')

        expect {
          post '/analyze_audio_dream',
               params: { file: audio_upload },
               headers: auth_headers(user)
        }.not_to change(Dream, :count)

        expect(response).to have_http_status(:forbidden)
        expect(json_response['limit_reached']).to be true
        expect(json_response['premium_required']).to be true
        expect(json_response['monthly_audio_limit']).to eq(limit)
        expect(json_response['error']).to include("月#{limit}回")
        expect(audio_usage_count(user)).to eq(limit)
        analyze_jobs = ActiveJob::Base.queue_adapter.enqueued_jobs.select { |j| j['job_class'] == 'AnalyzeDreamJob' }
        expect(analyze_jobs).to be_empty
      end

      it '先月の利用は今月の回数に入れない' do
        create_list(:ai_usage_log, limit, user: user, feature: 'audio_analysis', created_at: 1.month.ago)

        authenticated_post '/analyze_audio_dream', user

        expect(response).not_to have_http_status(:forbidden)
      end

      it 'ほかの機能（夢の分析）の利用は音声の回数に入れない' do
        create_list(:ai_usage_log, limit, user: user, feature: 'dream_analysis')

        authenticated_post '/analyze_audio_dream', user

        expect(response).not_to have_http_status(:forbidden)
      end

      it 'プレミアム会員は月の上限を超えても使え、利用ログは残す' do
        user.update!(premium: true)
        create_list(:ai_usage_log, limit, user: user, feature: 'audio_analysis')

        expect {
          post '/analyze_audio_dream',
               params: { file: audio_upload },
               headers: auth_headers(user)
        }.to change { audio_usage_count(user) }.by(1)

        expect(response).to have_http_status(:ok)
      end
    end

    context 'メール未確認ユーザーのAI課金機能ゲート' do
      it '未確認の本登録ユーザーは403で、夢もジョブも作られない' do
        unverified = create(:user, :unverified, :with_self_profile)

        expect {
          post '/analyze_audio_dream',
               params: { file: audio_upload },
               headers: auth_headers(unverified)
        }.not_to change(Dream, :count)

        expect(response).to have_http_status(:forbidden)
        expect(JSON.parse(response.body)['email_verification_required']).to be true
        analyze_jobs = ActiveJob::Base.queue_adapter.enqueued_jobs.select { |j| j['job_class'] == 'AnalyzeDreamJob' }
        expect(analyze_jobs).to be_empty
      end

      it '未確認のトライアルユーザーは上限内なら従来通り実行できる（体験導線を壊さない）' do
        trial = create(:user, :unverified, :with_self_profile, trial_user: true, trial_audio_count: 0)

        expect {
          post '/analyze_audio_dream',
               params: { file: audio_upload },
               headers: auth_headers(trial)
        }.to change { trial.dreams.count }.by(1)

        expect(response).to have_http_status(:ok)
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

  describe 'GET /audio_quota' do
    let(:limit) { AudioDreamsController::FREE_AUDIO_MONTHLY_LIMIT }

    it '無料プランは今月の使用回数と残りを返す（先月とほかの機能は数えない）' do
      create_list(:ai_usage_log, 2, user: user, feature: 'audio_analysis')
      create(:ai_usage_log, user: user, feature: 'audio_analysis', created_at: 1.month.ago)
      create(:ai_usage_log, user: user, feature: 'dream_analysis')

      authenticated_get '/audio_quota', user

      expect(response).to have_http_status(:ok)
      expect(json_response).to include('used' => 2, 'limit' => limit, 'remaining' => limit - 2)
    end

    it '使い切っていれば残りは0' do
      create_list(:ai_usage_log, limit + 1, user: user, feature: 'audio_analysis')

      authenticated_get '/audio_quota', user

      expect(json_response['remaining']).to eq(0)
    end

    it 'プレミアム会員は unlimited を返す' do
      user.update!(premium: true)

      authenticated_get '/audio_quota', user

      expect(json_response['unlimited']).to be true
    end

    it 'トライアルユーザーはお試しの回数を返す' do
      user.update!(trial_user: true, trial_audio_count: 1)

      authenticated_get '/audio_quota', user

      expect(json_response).to include(
        'trial' => true,
        'used' => 1,
        'limit' => AudioDreamsController::TRIAL_AUDIO_LIMIT,
        'remaining' => 0
      )
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :get, '/audio_quota'
    end
  end
end
