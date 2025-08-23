require 'rails_helper'

RSpec.describe 'Dreams API', type: :request do
  # テスト前にデータベースをクリーンアップ
  before(:each) do
    User.destroy_all
    Dream.destroy_all
    Emotion.destroy_all
  end

  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }
  let!(:emotions) do
    [
      create(:emotion, :happiness),
      create(:emotion, :sadness),
      create(:emotion, :fear)
    ]
  end

  describe 'GET /dreams/my_dreams' do
    context '認証済みユーザーの場合' do
      let!(:user_dreams) { create_list(:dream, 3, user: user) }
      let!(:other_user_dreams) { create_list(:dream, 2, user: other_user) }

      it '自分の夢一覧のみを取得できる' do
        authenticated_get('/dreams/my_dreams', user)

        expect(response).to have_http_status(:ok)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to be_an(Array)
        expect(json_response.length).to eq(3)
        
        # 自分の夢のみが含まれることを確認
        json_response.each do |dream|
          expect(dream['user_id']).to eq(user.id) if dream['user_id']
        end
      end

      it 'emotion_idsパラメーターでフィルタリングできる' do
        # 特定の感情を持つ夢を作成
        dream_with_emotion = create(:dream, user: user)
        dream_with_emotion.emotions = [emotions.first]
        
        authenticated_get('/dreams/my_dreams', user, params: { emotion_ids: [emotions.first.id] })

        expect(response).to have_http_status(:ok)
        
        json_response = JSON.parse(response.body)
        expect(json_response.length).to be >= 1
        
        # emotionsが含まれているか確認
        expect(json_response.first).to have_key('emotions')
      end

      it 'queryパラメーターでタイトルと内容を検索できる' do
        search_dream = create(:dream, user: user, title: '特別な夢', content: '検索対象の内容')
        
        authenticated_get('/dreams/my_dreams', user, params: { query: '特別' })

        expect(response).to have_http_status(:ok)
        
        json_response = JSON.parse(response.body)
        expect(json_response.length).to be >= 1
        expect(json_response.first['title']).to include('特別')
      end

      it '日付範囲でフィルタリングできる' do
        # 今日作成した夢
        today_dream = create(:dream, user: user, title: '今日の夢')
        
        authenticated_get('/dreams/my_dreams', user, params: { 
          start_date: Date.current.beginning_of_day.iso8601,
          end_date: Date.current.end_of_day.iso8601
        })

        expect(response).to have_http_status(:ok)
        
        json_response = JSON.parse(response.body)
        expect(json_response.length).to be >= 1
      end
    end

    context '認証されていない場合' do
      it '401エラーを返す' do
        get '/dreams/my_dreams'
        
        expect(response).to have_http_status(:unauthorized)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('error')
      end
    end
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

        expect(response).to have_http_status(:unprocessable_entity)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key('error')
        expect(json_response['error']).to be_an(Array)
      end

      it 'タイトルが100文字を超える場合失敗する' do
        long_title = 'あ' * 101
        params = valid_dream_params.merge(dream: { title: long_title, content: '内容' })
        
        authenticated_post('/dreams', user, params: params)
        
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it '内容が1000文字を超える場合失敗する' do
        long_content = 'あ' * 1001
        params = valid_dream_params.merge(dream: { title: 'タイトル', content: long_content })
        
        authenticated_post('/dreams', user, params: params)
        
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context '認証されていない場合' do
      it '401エラーを返す' do
        post '/dreams', params: valid_dream_params, headers: { 'Content-Type' => 'application/json' }
        
        expect(response).to have_http_status(:unauthorized)
      end
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
      it '401エラーを返す' do
        get "/dreams/#{user_dream.id}"
        
        expect(response).to have_http_status(:unauthorized)
      end
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

        expect(response).to have_http_status(:unprocessable_entity)
        
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
      it '401エラーを返す' do
        put "/dreams/#{user_dream.id}", params: update_params, headers: { 'Content-Type' => 'application/json' }
        
        expect(response).to have_http_status(:unauthorized)
      end
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
      it '401エラーを返す' do
        delete "/dreams/#{user_dream.id}"
        
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'GET /dreams (index)' do
    let!(:user_dreams) { create_list(:dream, 3, user: user) }

    context '認証済みユーザーの場合' do
      it '自分の夢一覧を取得できる（簡略版）' do
        authenticated_get('/dreams', user)

        expect(response).to have_http_status(:ok)
        
        json_response = JSON.parse(response.body)
        expect(json_response).to be_an(Array)
        expect(json_response.length).to eq(3)
        
        # 簡略版なので特定のフィールドのみ含まれる
        json_response.each do |dream|
          expect(dream).to have_key('id')
          expect(dream).to have_key('title')
          expect(dream).to have_key('created_at')
          expect(dream).not_to have_key('content') # indexでは内容は含まれない
        end
      end

      it 'queryパラメーターでタイトルをフィルタリングできる' do
        special_dream = create(:dream, user: user, title: '特別な夢のタイトル')
        
        authenticated_get('/dreams', user, params: { query: '特別' })

        expect(response).to have_http_status(:ok)
        
        json_response = JSON.parse(response.body)
        expect(json_response.length).to be >= 1
        expect(json_response.any? { |dream| dream['title'].include?('特別') }).to be true
      end
    end

    context '認証されていない場合' do
      it '401エラーを返す' do
        get '/dreams'
        
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end