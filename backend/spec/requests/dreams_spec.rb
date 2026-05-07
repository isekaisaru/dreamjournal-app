require 'rails_helper'

RSpec.describe 'Dreams API', type: :request do
  # ActiveJobのテストヘルパーをインクルード
  include ActiveJob::TestHelper

  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }
  let!(:emotions) do
    [
      create(:emotion, :happiness),
      create(:emotion, :sadness),
      create(:emotion, :fear)
    ]
  end

  describe 'POST /dreams' do
    let(:valid_dream_params) do
      {
        dream: {
          title: '新しい夢',
          content: 'これは新しい夢の内容です。とても興味深い体験でした。',
          emotion_ids: [emotions.first.id, emotions.second.id]
        }
      }
    end

    let(:invalid_dream_params) do
      {
        dream: {
          title: '',
          content: '',
          emotion_ids: []
        }
      }
    end

    context '認証済みユーザーの場合' do
      it '有効なパラメーターで夢を作成できる' do
        expect {
          authenticated_post('/dreams', user, params: valid_dream_params)
        }.to change(Dream, :count).by(1)

        expect(response).to have_http_status(:created)
        
        json_response = JSON.parse(response.body)
        expect(json_response['title']).to eq('新しい夢')
        expect(json_response['content']).to eq('これは新しい夢の内容です。とても興味深い体験でした。')
        expect(json_response['user_id']).to eq(user.id)
        
        # 作成された夢に感情が関連付けられているか確認
        created_dream = Dream.last
        expect(created_dream.emotions.count).to eq(2)
      end

      it '無効なパラメーターで夢作成に失敗する' do
        expect {
          authenticated_post('/dreams', user, params: invalid_dream_params)
        }.not_to change(Dream, :count)

        expect(response).to have_http_status(:unprocessable_content)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('error')
        expect(json_response['error']).to be_an(Array)
      end

      it 'タイトルが100文字を超える場合失敗する' do
        long_title = 'あ' * 101
        params = valid_dream_params.merge(dream: { title: long_title, content: '内容' })
        
        authenticated_post('/dreams', user, params: params)
        
        expect(response).to have_http_status(:unprocessable_content)
      end

      it '内容が1000文字を超える場合失敗する' do
        long_content = 'あ' * 1001
        params = valid_dream_params.merge(dream: { title: 'タイトル', content: long_content })
        
        authenticated_post('/dreams', user, params: params)
        
        expect(response).to have_http_status(:unprocessable_content)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :post, '/dreams', { dream: { title: 'test' } }
    end
  end

  describe 'GET /dreams/:id' do
    let!(:user_dream) { create(:dream, user: user, title: 'ユーザーの夢', content: 'ユーザーの夢の詳細内容') }
    let!(:other_user_dream) { create(:dream, user: other_user, title: '他人の夢') }

    context '認証済みユーザーの場合' do
      it '自分の夢の詳細を取得できる' do
        authenticated_get("/dreams/#{user_dream.id}", user)

        expect(response).to have_http_status(:ok)
        
        json_response = JSON.parse(response.body)
        expect(json_response['id']).to eq(user_dream.id)
        expect(json_response['title']).to eq('ユーザーの夢')
        expect(json_response['content']).to eq('ユーザーの夢の詳細内容')
        expect(json_response).to have_key('created_at')
      end

      it '他人の夢にはアクセスできない' do
        authenticated_get("/dreams/#{other_user_dream.id}", user)

        expect(response).to have_http_status(:forbidden)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('error')
        expect(json_response['error']).to include('アクセス権限')
      end

      it '存在しない夢IDの場合404エラーを返す' do
        authenticated_get('/dreams/99999', user)

        expect(response).to have_http_status(:not_found)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('error')
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :get, '/dreams/1' # IDはダミーでOK
    end
  end

  describe 'PUT /dreams/:id' do
    let!(:user_dream) { create(:dream, user: user, title: '元のタイトル', content: '元の内容') }
    let!(:other_user_dream) { create(:dream, user: other_user) }

    let(:update_params) do
      {
        dream: {
          title: '更新されたタイトル',
          content: '更新された内容です。新しい情報が追加されました。',
          emotion_ids: [emotions.first.id]
        }
      }
    end

    let(:invalid_update_params) do
      {
        dream: {
          title: '',
          content: ''
        }
      }
    end

    context '認証済みユーザーの場合' do
      it '自分の夢を更新できる' do
        authenticated_put("/dreams/#{user_dream.id}", user, params: update_params)

        expect(response).to have_http_status(:ok)
        
        json_response = JSON.parse(response.body)
        expect(json_response['title']).to eq('更新されたタイトル')
        expect(json_response['content']).to eq('更新された内容です。新しい情報が追加されました。')
        
        # データベースでも更新されているか確認
        user_dream.reload
        expect(user_dream.title).to eq('更新されたタイトル')
        expect(user_dream.content).to eq('更新された内容です。新しい情報が追加されました。')
      end

      it '感情の関連付けを更新できる' do
        authenticated_put("/dreams/#{user_dream.id}", user, params: update_params)

        expect(response).to have_http_status(:ok)
        
        user_dream.reload
        expect(user_dream.emotions.count).to eq(1)
        expect(user_dream.emotions.first.id).to eq(emotions.first.id)
      end

      it '無効なパラメーターで更新に失敗する' do
        authenticated_put("/dreams/#{user_dream.id}", user, params: invalid_update_params)

        expect(response).to have_http_status(:unprocessable_content)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('error')
      end

      it '他人の夢は更新できない' do
        authenticated_put("/dreams/#{other_user_dream.id}", user, params: update_params)

        expect(response).to have_http_status(:forbidden)
      end

      it '存在しない夢IDの場合404エラーを返す' do
        authenticated_put('/dreams/99999', user, params: update_params)

        expect(response).to have_http_status(:not_found)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :put, '/dreams/1', { dream: { title: 'test' } }
    end
  end

  describe 'DELETE /dreams/:id' do
    let!(:user_dream) { create(:dream, user: user) }
    let!(:other_user_dream) { create(:dream, user: other_user) }

    context '認証済みユーザーの場合' do
      it '自分の夢を削除できる' do
        expect {
          authenticated_delete("/dreams/#{user_dream.id}", user)
        }.to change(Dream, :count).by(-1)

        expect(response).to have_http_status(:no_content)
        
        # 夢が実際に削除されているか確認
        expect(Dream.find_by(id: user_dream.id)).to be_nil
      end

      it '他人の夢は削除できない' do
        expect {
          authenticated_delete("/dreams/#{other_user_dream.id}", user)
        }.not_to change(Dream, :count)

        expect(response).to have_http_status(:forbidden)
      end

      it '存在しない夢IDの場合404エラーを返す' do
        authenticated_delete('/dreams/99999', user)

        expect(response).to have_http_status(:not_found)
      end

      it '関連する感情も削除される' do
        # 夢に感情を関連付け
        user_dream.emotions = [emotions.first, emotions.second]
        user_dream.save!

        expect {
          authenticated_delete("/dreams/#{user_dream.id}", user)
        }.to change(Dream, :count).by(-1)

        # 中間テーブルのレコードも削除されているか確認
        expect(user_dream.dream_emotions.count).to eq(0)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :delete, '/dreams/1'
    end
  end

  describe 'GET /dreams (index)' do
    context '認証済みユーザーの場合' do
      it '自分の夢一覧を取得できる' do
        create_list(:dream, 3, user: user)
        create(:dream, user: other_user) # 他のユーザーの夢

        authenticated_get('/dreams', user)

        expect(response).to have_http_status(:ok)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to be_an(Array)
        expect(json_response.length).to eq(3)
      end

      context 'フィルタリング' do
        it 'emotion_idsパラメーターでフィルタリングできる' do
          dream_with_emotion = create(:dream, user: user)
          dream_with_emotion.emotions = [emotions.first]
          create(:dream, user: user) # フィルタリングされない夢
          
          authenticated_get('/dreams', user, params: { emotion_ids: [emotions.first.id] })

          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)
          expect(json_response.length).to eq(1)
          expect(json_response.first['id']).to eq(dream_with_emotion.id)
        end

        it 'queryパラメーターでタイトルと内容を検索できる' do
          search_dream = create(:dream, user: user, title: '特別な夢', content: '検索対象の内容')
          create(:dream, user: user, title: '普通の夢') # フィルタリングされない夢

          authenticated_get('/dreams', user, params: { query: '特別' })

          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)
          expect(json_response.length).to eq(1)
          expect(json_response.first['id']).to eq(search_dream.id)
        end

        it '日付範囲でフィルタリングできる' do
          today_dream = create(:dream, user: user, created_at: Time.current)
          create(:dream, user: user, created_at: 2.days.ago) # フィルタリングされない夢

          authenticated_get('/dreams', user, params: { 
            start_date: Date.current.beginning_of_day.iso8601,
            end_date: Date.current.end_of_day.iso8601
          })

          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)
          expect(json_response.length).to eq(1)
          expect(json_response.first['id']).to eq(today_dream.id)
        end
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :get, '/dreams'
    end
  end

  describe 'GET /dreams/month/:year_month' do
    let!(:may_dream) do
      create(
        :dream,
        user: user,
        title: '5月の夢',
        content: '空の上を歩く夢',
        created_at: Time.zone.parse('2025-05-10 12:00:00'),
        analysis_status: 'done',
        analysis_json: { analysis: '明るい気持ち', emotion_tags: ['嬉しい', '安心'] }
      )
    end
    let!(:april_dream) do
      create(
        :dream,
        user: user,
        title: '4月の夢',
        created_at: Time.zone.parse('2025-04-25 12:00:00')
      )
    end
    let!(:other_user_dream) do
      create(
        :dream,
        user: other_user,
        title: '他人の5月の夢',
        created_at: Time.zone.parse('2025-05-12 12:00:00')
      )
    end

    before do
      may_dream.emotions = [emotions.first, emotions.third]
      may_dream.save!
    end

    context '認証済みユーザーの場合' do
      it '指定月の自分の夢だけを返し、分析結果と感情タグを含む' do
        authenticated_get('/dreams/month/2025-05', user)

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response.length).to eq(1)
        expect(json_response.first['id']).to eq(may_dream.id)
        expect(json_response.first['analysis_status']).to eq('done')
        expect(json_response.first['analysis_json']['analysis']).to eq('明るい気持ち')
        expect(json_response.first['emotions'].map { |emotion| emotion['id'] }).to match_array(
          [emotions.first.id, emotions.third.id]
        )
      end

      it '不正な年月フォーマットなら 400 を返す' do
        authenticated_get('/dreams/month/2025-13', user)

        expect(response).to have_http_status(:bad_request)
        json_response = JSON.parse(response.body)
        expect(json_response['error']).to include('YYYY-MM')
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :get, '/dreams/month/2025-05'
    end
  end

  describe 'POST /dreams/:id/analyze' do
    let!(:dream) { create(:dream, user: user, content: 'A dream to be analyzed.') }
    # contentのバリデーションをスキップして、内容が空のテストデータを作成する
    let!(:dream_without_content) do
      dream = build(:dream, user: user, content: '')
      dream.save(validate: false)
      dream
    end

    context '認証済みユーザーの場合' do
      around do |example|
        original_adapter = ActiveJob::Base.queue_adapter
        ActiveJob::Base.queue_adapter = :test
        example.run
      ensure
        ActiveJob::Base.queue_adapter = original_adapter
      end

      it '夢の分析ジョブをキューに入れ、202 Acceptedを返す' do
        # perform_enqueued_jobs ブロック内でジョブがキューに入ることを確認
        assert_enqueued_with(job: AnalyzeDreamJob, args: [dream.id]) do
          authenticated_post "/dreams/#{dream.id}/analyze", user
        end

        expect(response).to have_http_status(:accepted)
        expect(response.location).to eq(analysis_dream_url(dream))
        expect(dream.reload.analysis_pending?).to be true
      end

      it '内容がない夢の場合は 422 Unprocessable Content を返す' do
        authenticated_post "/dreams/#{dream_without_content.id}/analyze", user
        expect(response).to have_http_status(:unprocessable_content)
      end

      it 'すでに分析中の場合は、ジョブを重複させずに 202 Accepted を返す' do
        dream.analysis_pending! # ステータスを 'pending' に設定

        # ジョブがキューに追加されないことを確認
        assert_no_enqueued_jobs do
          authenticated_post "/dreams/#{dream.id}/analyze", user
        end

        expect(response).to have_http_status(:accepted)
      end

      it '他人の夢は分析できない' do
        other_dream = create(:dream, user: other_user, content: 'secret')
        authenticated_post "/dreams/#{other_dream.id}/analyze", user
        expect(response).to have_http_status(:forbidden)
      end

      it 'トライアル上限到達後でも分析済みの夢はキャッシュ結果を返す' do
        user.update!(trial_user: true, trial_analysis_count: 3)
        dream.mark_done!({ analysis: 'cached result', emotion_tags: ['happy'] })

        assert_no_enqueued_jobs do
          authenticated_post "/dreams/#{dream.id}/analyze", user
        end

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response['cached']).to be true
        expect(json_response['result']['analysis']).to eq('cached result')
      end

      it '無料プランの月次上限に達している場合は403を返し、ジョブを積まない' do
        user.update!(
          monthly_analysis_count: User::FREE_ANALYSIS_MONTHLY_LIMIT,
          monthly_analysis_count_reset_at: Time.current.beginning_of_month
        )

        assert_no_enqueued_jobs do
          authenticated_post "/dreams/#{dream.id}/analyze", user
        end

        expect(response).to have_http_status(:forbidden)
        expect(json_response['limit_reached']).to eq(true)
        expect(json_response['monthly_analysis_limit']).to eq(User::FREE_ANALYSIS_MONTHLY_LIMIT)
      end

      it '無料プランでは分析受付時に月次カウントを増やす' do
        expect do
          authenticated_post "/dreams/#{dream.id}/analyze", user
        end.to change { user.reload.monthly_analysis_count }.by(1)

        expect(response).to have_http_status(:accepted)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :post, '/dreams/1/analyze'
    end
  end

  describe 'POST /dreams/preview_analysis' do
    context '認証済みユーザーの場合' do
      it 'トライアルの永続カウンタ上限に達している場合は夢を削除しても403を返す' do
        user.update!(trial_user: true, trial_analysis_count: 3)

        expect(DreamAnalysisService).not_to receive(:analyze)
        authenticated_post '/dreams/preview_analysis', user, params: { content: '空を飛ぶ夢' }

        expect(response).to have_http_status(:forbidden)
      end

      it '無料プランの月次上限に達している場合は403を返す' do
        user.update!(
          monthly_analysis_count: User::FREE_ANALYSIS_MONTHLY_LIMIT,
          monthly_analysis_count_reset_at: Time.current.beginning_of_month
        )

        expect(DreamAnalysisService).not_to receive(:analyze)
        authenticated_post '/dreams/preview_analysis', user, params: { content: '空を飛ぶ夢' }

        expect(response).to have_http_status(:forbidden)
        expect(json_response['limit_reached']).to eq(true)
      end

      it '無料プランではリクエスト受付時にスロットを確保してカウントを増やす' do
        allow(DreamAnalysisService).to receive(:analyze).and_return({ analysis: 'result', emotion_tags: ['happy'] })

        expect do
          authenticated_post '/dreams/preview_analysis', user, params: { content: '空を飛ぶ夢' }
        end.to change { user.reload.monthly_analysis_count }.by(1)

        expect(response).to have_http_status(:ok)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :post, '/dreams/preview_analysis', { content: '空を飛ぶ夢' }
    end
  end

  describe 'GET /dreams/:id/analysis' do
    let!(:dream) { create(:dream, user: user) }

    context '認証済みユーザーの場合' do
      it 'ステータスが "pending" の場合にその状態を返す' do
        dream.analysis_pending!
        authenticated_get "/dreams/#{dream.id}/analysis", user

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response['status']).to eq('pending')
      end

      it 'ステータスが "done" の場合に結果と共に返す' do
        analysis_data = { text: 'Your dream means you are a hero.' }
        dream.mark_done!(analysis_data)
        authenticated_get "/dreams/#{dream.id}/analysis", user

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response['status']).to eq('done')
        expect(json_response['result']['text']).to eq(analysis_data[:text])
        expect(json_response['analyzed_at']).not_to be_nil
      end

      it 'ステータスが "failed" の場合にエラーメッセージと共に返す' do
        error_message = 'Analysis failed.'
        dream.mark_failed!(error_message)
        authenticated_get "/dreams/#{dream.id}/analysis", user

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response['status']).to eq('failed')
        expect(json_response['result']['error']).to eq(error_message)
      end

      it '他人の夢の分析結果は取得できない' do
        other_dream = create(:dream, user: other_user)
        authenticated_get "/dreams/#{other_dream.id}/analysis", user
        expect(response).to have_http_status(:forbidden)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :get, '/dreams/1/analysis'
    end
  end

  describe 'POST /dreams/:id/generate_image' do
    let!(:dream) do
      create(
        :dream,
        user: user,
        content: '空を飛びながら星のあいだを泳ぐ夢を見ました。',
        analysis_json: { 'analysis' => '自由で穏やかな気持ちを表しています。' }
      )
    end
    let(:access_token) { AuthService.encode_token(user.id) }
    let(:fixed_auth_headers) { { 'Content-Type' => 'application/json', 'Cookie' => "access_token=#{access_token}", 'HOST' => 'backend' } }
    let(:generated_url) { 'https://oaidalleapiprodscus.blob.core.windows.net/generated/test.png' }
    let(:images_client) { double('OpenAI::Images') }
    let(:openai_client) { double('OpenAI::Client', images: images_client) }

    before do
      @original_openai_client = $openai_client
      $openai_client = openai_client
    end

    after do
      $openai_client = @original_openai_client
    end

    context '認証済みユーザーの場合' do
      it '画像を生成して generated_image_url を保存し 200 を返す' do
        expect(images_client).to receive(:generate).with(
          parameters: hash_including(
            model: 'gpt-image-1',
            n: 1,
            size: '1024x1024',
            quality: 'medium',
            prompt: a_string_including('空を飛びながら星のあいだを泳ぐ夢')
          )
        ).and_return({ 'data' => [{ 'url' => generated_url }] })

        expect {
          authenticated_post "/dreams/#{dream.id}/generate_image", user
        }.to change(DreamImageGeneration, :count).by(1)

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['image_url']).to eq(generated_url)
        expect(dream.reload.generated_image_url).to eq(generated_url)
        expect(dream.image_generated_at).to be_present
        generation = DreamImageGeneration.order(:id).last
        expect(generation.dream_id).to eq(dream.id)
        expect(generation.user_id).to eq(user.id)
      end

      it '画像生成プロンプトで怖くなりすぎる表現とテンプレート化を避ける' do
        expect(images_client).to receive(:generate).with(
          parameters: hash_including(
            prompt: a_string_including(
              'generic dream template',
              'never literal horror',
              'safe, comforting, and age-appropriate'
            )
          )
        ).and_return({ 'data' => [{ 'url' => generated_url }] })

        authenticated_post "/dreams/#{dream.id}/generate_image", user

        expect(response).to have_http_status(:ok)
      end

      it 'gpt-image-1 が b64_json を返す場合はデータURLとして保存し 200 を返す' do
        b64_data = Base64.strict_encode64('fake_png_binary_data')
        allow(images_client).to receive(:generate).and_return({ 'data' => [{ 'b64_json' => b64_data }] })

        authenticated_post "/dreams/#{dream.id}/generate_image", user

        expected_data_url = "data:image/png;base64,#{b64_data}"
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['image_url']).to eq(expected_data_url)
        expect(dream.reload.generated_image_url).to eq(expected_data_url)
      end

      it 'gpt-image-1 が url と b64_json の両方を返す場合は b64_json を優先して保存する' do
        b64_data = Base64.strict_encode64('persistent_png_binary_data')
        allow(images_client).to receive(:generate).and_return({
          'data' => [{ 'url' => generated_url, 'b64_json' => b64_data }]
        })

        authenticated_post "/dreams/#{dream.id}/generate_image", user

        expected_data_url = "data:image/png;base64,#{b64_data}"
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['image_url']).to eq(expected_data_url)
        expect(dream.reload.generated_image_url).to eq(expected_data_url)
      end

      it 'OpenAI が url も b64_json も返さない場合は 422 を返す' do
        allow(images_client).to receive(:generate).and_return({ 'data' => [{}] })

        authenticated_post "/dreams/#{dream.id}/generate_image", user

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)['error']).to include('画像URLの取得に失敗')
        expect(dream.reload.generated_image_url).to be_nil
      end

      it 'OpenAI クライアントが nil の場合は 503 を返す' do
        $openai_client = nil

        authenticated_post "/dreams/#{dream.id}/generate_image", user

        expect(response).to have_http_status(:service_unavailable)
        expect(JSON.parse(response.body)['error']).to include('画像生成機能は現在利用できません')
      end

      it '同じ夢の再生成も月次 quota に 1 回ずつ加算する' do
        create_list(
          :dream_image_generation,
          DreamsController::IMAGE_MONTHLY_LIMIT - 1,
          user: user,
          dream: dream,
          generated_at: Time.current
        )
        allow(images_client).to receive(:generate).and_return({ 'data' => [{ 'url' => generated_url }] })

        expect {
          post "/dreams/#{dream.id}/generate_image", params: {}.to_json, headers: fixed_auth_headers
        }.to change(DreamImageGeneration, :count).by(1)
        expect(response).to have_http_status(:ok)

        post "/dreams/#{dream.id}/generate_image", params: {}.to_json, headers: fixed_auth_headers

        expect(response).to have_http_status(:forbidden)
        expect(JSON.parse(response.body)['limit_reached']).to eq(true)
      end

      it '他人の夢は画像生成できない（403）' do
        other_dream = create(:dream, user: other_user, content: '秘密の夢')
        expect(images_client).not_to receive(:generate)

        authenticated_post "/dreams/#{other_dream.id}/generate_image", user

        expect(response).to have_http_status(:forbidden)
      end

      describe '年齢帯ごとのプロンプトスタイル' do
        let(:style_dream) { create(:dream, user: age_user, content: 'テスト用の夢') }

        shared_examples 'プロンプトにスタイルが含まれる' do |expected_fragment|
          it "プロンプトに '#{expected_fragment}' が含まれる" do
            expect(images_client).to receive(:generate).with(
              parameters: hash_including(
                prompt: a_string_including(expected_fragment)
              )
            ).and_return({ 'data' => [{ 'url' => generated_url }] })

            authenticated_post "/dreams/#{style_dream.id}/generate_image", age_user
            expect(response).to have_http_status(:ok)
          end
        end

        context 'child ユーザー' do
          let(:age_user) { create(:user, age_group: 'child') }
          include_examples 'プロンプトにスタイルが含まれる', 'pastel colors'
        end

        context 'child_small ユーザー' do
          let(:age_user) { create(:user, age_group: 'child_small') }
          include_examples 'プロンプトにスタイルが含まれる', 'child-friendly'
        end

        context 'preteen ユーザー' do
          let(:age_user) { create(:user, age_group: 'preteen') }
          include_examples 'プロンプトにスタイルが含まれる', 'adventurous'
        end

        context 'teen ユーザー' do
          let(:age_user) { create(:user, age_group: 'teen') }
          include_examples 'プロンプトにスタイルが含まれる', 'cool and stylish'
        end

        context 'adult ユーザー' do
          let(:age_user) { create(:user, age_group: 'adult') }
          include_examples 'プロンプトにスタイルが含まれる', 'sophisticated'
        end

        context 'age_group がデフォルト（child）のユーザー' do
          let(:age_user) { create(:user) }
          include_examples 'プロンプトにスタイルが含まれる', 'child-friendly'
        end
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :post, '/dreams/1/generate_image'
    end
  end

  describe 'GET /dreams/image_quota' do
    let!(:dream) { create(:dream, user: user) }

    before do
      create(:dream_image_generation, user: user, dream: dream, generated_at: Time.current)
      create(:dream_image_generation, user: user, dream: dream, generated_at: Time.current)
      create(:dream_image_generation, user: user, dream: dream, generated_at: 2.months.ago)
      create(:dream_image_generation, user: other_user, dream: create(:dream, user: other_user), generated_at: Time.current)
    end

    context '認証済みユーザーの場合' do
      it '当月の生成イベント数を返し、同じ夢の再生成も個別に数える' do
        authenticated_get '/dreams/image_quota', user

        expect(response).to have_http_status(:ok)
        expect(json_response['used']).to eq(2)
        expect(json_response['limit']).to eq(DreamsController::IMAGE_MONTHLY_LIMIT)
        expect(json_response['remaining']).to eq(DreamsController::IMAGE_MONTHLY_LIMIT - 2)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :get, '/dreams/image_quota'
    end
  end

  describe 'GET /dreams/analysis_quota' do
    context 'フリープランユーザーの場合' do
      before { user.update!(monthly_analysis_count: 3) }

      it '使用数・上限・残数を返す' do
        authenticated_get '/dreams/analysis_quota', user

        expect(response).to have_http_status(:ok)
        expect(json_response['used']).to eq(3)
        expect(json_response['limit']).to eq(User::FREE_ANALYSIS_MONTHLY_LIMIT)
        expect(json_response['remaining']).to eq(User::FREE_ANALYSIS_MONTHLY_LIMIT - 3)
      end
    end

    context 'プレミアムユーザーの場合' do
      let!(:premium_user) { create(:user, premium: true) }

      it 'unlimited: true を返す' do
        authenticated_get '/dreams/analysis_quota', premium_user

        expect(response).to have_http_status(:ok)
        expect(json_response['unlimited']).to be true
      end
    end

    context 'トライアルユーザーの場合' do
      let!(:trial_user) { create(:user, trial_user: true, trial_analysis_count: 1) }

      it 'trial: true と残数を返す' do
        authenticated_get '/dreams/analysis_quota', trial_user

        expect(response).to have_http_status(:ok)
        expect(json_response['trial']).to be true
        expect(json_response['used']).to eq(1)
        expect(json_response['remaining']).to eq(DreamsController::TRIAL_ANALYSIS_LIMIT - 1)
      end
    end

    context '認証されていない場合' do
      it_behaves_like 'unauthorized request', :get, '/dreams/analysis_quota'
    end
  end
end
