require 'rails_helper'

RSpec.describe 'DreamProfiles API', type: :request do
  let!(:user)       { create(:user) }
  let!(:other_user) { create(:user) }

  # ------------------------------------------------------------------ #
  # GET /dream_profiles                                                  #
  # ------------------------------------------------------------------ #
  describe 'GET /dream_profiles' do
    context '認証済みユーザーの場合' do
      before do
        create(:dream_profile, user: user, name: "自分", relationship: "self", position: 0)
        create(:dream_profile, user: user, name: "パートナー", relationship: "partner", position: 1)
        create(:dream_profile, :archived, user: user, name: "旧友", relationship: "friend")
        create(:dream_profile, user: other_user)
      end

      it 'ユーザー自身のプロフィール（active/archived 含む）を返す' do
        authenticated_get('/dream_profiles', user)

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json.length).to eq(3)
        names = json.map { |p| p['name'] }
        expect(names).to include("自分", "パートナー", "旧友")
      end

      it '他ユーザーのプロフィールを含まない' do
        authenticated_get('/dream_profiles', user)
        json = JSON.parse(response.body)
        ids = json.map { |p| p['id'] }
        expect(DreamProfile.where(id: ids).pluck(:user_id).uniq).to eq([user.id])
      end

      it 'archived フィールドを含む' do
        authenticated_get('/dream_profiles', user)
        json = JSON.parse(response.body)
        archived_profile = json.find { |p| p['name'] == '旧友' }
        expect(archived_profile['archived']).to eq(true)
        active_profile = json.find { |p| p['name'] == '自分' }
        expect(active_profile['archived']).to eq(false)
      end
    end

    context '未認証の場合' do
      it '401 を返す' do
        get '/dream_profiles'
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # ------------------------------------------------------------------ #
  # POST /dream_profiles                                                 #
  # ------------------------------------------------------------------ #
  describe 'POST /dream_profiles' do
    let(:valid_params) do
      { name: "友達", avatar_emoji: "👫", color: "#ff6b6b", relationship: "friend" }
    end

    context '認証済みユーザーの場合' do
      it '有効なパラメーターでプロフィールを作成できる' do
        expect {
          authenticated_post('/dream_profiles', user, params: valid_params)
        }.to change(DreamProfile, :count).by(1)

        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        expect(json['name']).to eq('友達')
        expect(json['relationship']).to eq('friend')
        expect(json['archived']).to eq(false)
      end

      it '無効なパラメーター（name 空）で 422 を返す' do
        expect {
          authenticated_post('/dream_profiles', user, params: valid_params.merge(name: ''))
        }.not_to change(DreamProfile, :count)

        expect(response).to have_http_status(:unprocessable_content)
      end

      context 'active が 5 件のとき' do
        before { create_list(:dream_profile, 5, user: user) }

        it '6件目の作成は 422 を返す' do
          expect {
            authenticated_post('/dream_profiles', user, params: valid_params)
          }.not_to change(DreamProfile, :count)

          expect(response).to have_http_status(:unprocessable_content)
          json = JSON.parse(response.body)
          expect(json['error']).to include('5件')
        end
      end
    end

    context '未認証の場合' do
      it '401 を返す' do
        post '/dream_profiles', params: valid_params, as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # ------------------------------------------------------------------ #
  # PATCH /dream_profiles/:id                                            #
  # ------------------------------------------------------------------ #
  describe 'PATCH /dream_profiles/:id' do
    let!(:profile) { create(:dream_profile, user: user, name: "旧名前") }

    context '認証済みユーザーの場合' do
      it 'name を更新できる' do
        authenticated_patch("/dream_profiles/#{profile.id}", user, params: { name: '新しい名前' })

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['name']).to eq('新しい名前')
        expect(profile.reload.name).to eq('新しい名前')
      end

      it '無効なパラメーターで 422 を返す' do
        authenticated_patch("/dream_profiles/#{profile.id}", user, params: { name: '' })
        expect(response).to have_http_status(:unprocessable_content)
      end

      it '他ユーザーのプロフィールは更新できない（404）' do
        other_profile = create(:dream_profile, user: other_user)
        authenticated_patch("/dream_profiles/#{other_profile.id}", user, params: { name: '乗っ取り' })
        expect(response).to have_http_status(:not_found)
      end
    end

    context '未認証の場合' do
      it '401 を返す' do
        patch "/dream_profiles/#{profile.id}", params: { name: '新名前' }, as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # ------------------------------------------------------------------ #
  # PATCH /dream_profiles/:id/archive                                    #
  # ------------------------------------------------------------------ #
  describe 'PATCH /dream_profiles/:id/archive' do
    let!(:profile) { create(:dream_profile, user: user) }

    context '認証済みユーザーの場合' do
      it 'プロフィールをアーカイブできる' do
        authenticated_patch("/dream_profiles/#{profile.id}/archive", user)

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['active']).to eq(false)
        expect(json['archived']).to eq(true)
        expect(profile.reload.active).to eq(false)
      end

      it 'self プロフィールのアーカイブは 422 を返す' do
        self_profile = create(:dream_profile, :self_profile, user: user)
        authenticated_patch("/dream_profiles/#{self_profile.id}/archive", user)

        expect(response).to have_http_status(:unprocessable_content)
        expect(self_profile.reload.active).to eq(true)
      end

      it '他ユーザーのプロフィールは操作できない（404）' do
        other_profile = create(:dream_profile, user: other_user)
        authenticated_patch("/dream_profiles/#{other_profile.id}/archive", user)
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  # ------------------------------------------------------------------ #
  # PATCH /dream_profiles/:id/restore                                    #
  # ------------------------------------------------------------------ #
  describe 'PATCH /dream_profiles/:id/restore' do
    let!(:archived_profile) { create(:dream_profile, :archived, user: user) }

    context '認証済みユーザーの場合' do
      it 'アーカイブ済みプロフィールを復元できる' do
        authenticated_patch("/dream_profiles/#{archived_profile.id}/restore", user)

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['active']).to eq(true)
        expect(json['archived']).to eq(false)
        expect(archived_profile.reload.active).to eq(true)
      end

      context 'active が 5 件のとき' do
        before { create_list(:dream_profile, 5, user: user) }

        it '復元は 422 を返す' do
          authenticated_patch("/dream_profiles/#{archived_profile.id}/restore", user)

          expect(response).to have_http_status(:unprocessable_content)
          json = JSON.parse(response.body)
          expect(json['error']).to include('5件')
          expect(archived_profile.reload.active).to eq(false)
        end
      end

      it '他ユーザーのプロフィールは操作できない（404）' do
        other_archived = create(:dream_profile, :archived, user: other_user)
        authenticated_patch("/dream_profiles/#{other_archived.id}/restore", user)
        expect(response).to have_http_status(:not_found)
      end
    end
  end
end
