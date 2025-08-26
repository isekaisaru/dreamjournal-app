require 'rails_helper'

RSpec.describe 'Dreams API', type: :request do
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
end