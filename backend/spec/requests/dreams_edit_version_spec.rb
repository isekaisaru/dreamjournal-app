require 'rails_helper'

# Issue #561: 編集開始時の版番号を送らせ、古い内容の保存を拒否する。
# 実際のスレッド割り込みは dreams_concurrent_update_spec.rb で検証する。
RSpec.describe 'PUT /dreams/:id の版番号', type: :request do
  let!(:user) { create(:user, :with_self_profile) }
  let!(:dream) { create(:dream, user: user, title: '元のタイトル', content: '元の内容') }
  let!(:happiness) { create(:emotion, :happiness) }
  let!(:sadness) { create(:emotion, :sadness) }
  let(:headers) { auth_headers(user) }
  let(:path) { "/dreams/#{dream.id}" }

  def json
    JSON.parse(response.body)
  end

  def fetched_version
    get path, headers: headers
    json['edit_version']
  end

  def put_edit(attrs, expected_edit_version:)
    put path, params: { dream: attrs, expected_edit_version: expected_edit_version }, headers: headers, as: :json
  end

  describe 'GET /dreams/:id' do
    it '新しい夢の版番号 0 を返す' do
      expect(fetched_version).to eq(0)
    end
  end

  context '編集開始時の版番号が最新のとき' do
    it '保存して版番号を1つ進める' do
      version = fetched_version

      put_edit({ title: '新しいタイトル', content: '新しい内容' }, expected_edit_version: version)

      expect(response).to have_http_status(:ok)
      expect(json['edit_version']).to eq(version + 1)
      expect(dream.reload.edit_version).to eq(version + 1)
      expect(dream.content).to eq('新しい内容')
    end

    it '感情タグだけの変更でも版番号を進める' do
      version = fetched_version

      put_edit({ emotion_ids: [happiness.id] }, expected_edit_version: version)

      expect(response).to have_http_status(:ok)
      expect(dream.reload.edit_version).to eq(version + 1)
      expect(dream.emotion_ids).to eq([happiness.id])
    end

    it 'バリデーションに失敗したら版番号も感情タグも変えない' do
      version = fetched_version

      put_edit({ title: '', emotion_ids: [happiness.id] }, expected_edit_version: version)

      expect(response).to have_http_status(:unprocessable_content)
      expect(dream.reload.edit_version).to eq(version)
      expect(dream.emotion_ids).to be_empty
    end
  end

  context 'DBへの到達順が PUT② → PUT① に逆転したとき' do
    it '古いPUT①を409で拒否し、新しい内容と最新の情報を返す' do
      version = fetched_version

      put_edit({ title: '新', content: '新しい内容' }, expected_edit_version: version)
      expect(response).to have_http_status(:ok)

      put_edit({ title: '旧', content: '古い内容' }, expected_edit_version: version)

      expect(response).to have_http_status(:conflict)
      expect(json['code']).to eq('edit_conflict')
      expect(json['error']).to be_present
      expect(json['current']).to include(
        'id' => dream.id,
        'title' => '新',
        'content' => '新しい内容',
        'dream_profile_id' => dream.dream_profile_id,
        'emotion_ids' => [],
        'edit_version' => version + 1
      )
      expect(dream.reload).to have_attributes(title: '新', content: '新しい内容', edit_version: version + 1)
    end

    it '拒否したPUT①の感情タグはDBに残さない' do
      version = fetched_version
      put_edit({ emotion_ids: [happiness.id] }, expected_edit_version: version)

      put_edit({ emotion_ids: [sadness.id] }, expected_edit_version: version)

      expect(response).to have_http_status(:conflict)
      expect(dream.reload.emotion_ids).to eq([happiness.id])
    end

    it '感情タグだけのPUT②の後でも、古いPUT①を拒否する' do
      version = fetched_version
      put_edit({ emotion_ids: [happiness.id] }, expected_edit_version: version)

      put_edit({ title: '旧', emotion_ids: [] }, expected_edit_version: version)

      expect(response).to have_http_status(:conflict)
      expect(json['current']['emotion_ids']).to eq([happiness.id])
      expect(dream.reload.title).to eq('元のタイトル')
    end
  end

  context '版番号の形式が不正なとき' do
    [nil, 'abc', 1.5, -1, [0]].each do |invalid|
      it "#{invalid.inspect} は422で拒否し、更新しない" do
        put_edit({ title: '更新されない' }, expected_edit_version: invalid)

        expect(response).to have_http_status(:unprocessable_content)
        expect(dream.reload).to have_attributes(title: '元のタイトル', edit_version: 0)
      end
    end
  end

  context '版番号を持たない旧クライアントのとき（移行期間の互換）' do
    it '受理して版番号を進め、夢IDだけをログに残す' do
      logged = []
      allow(Rails.logger).to receive(:warn) { |message| logged << message.to_s }

      put path, params: { dream: { title: '旧タブ', content: '旧タブの秘密の本文' } }, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(dream.reload.edit_version).to eq(1)
      version_logs = logged.select { |message| message.include?('expected_edit_version') }
      expect(version_logs.size).to eq(1)
      expect(version_logs.first).to include("dream_id=#{dream.id}")
      expect(version_logs.first).not_to include('旧タブの秘密の本文')
    end
  end

  context '分析結果だけの更新（Trialの紐付けPATCH）のとき' do
    it '版番号なしで受理し、版番号を進めない' do
      patch path,
            params: { dream: { analysis_json: { analysis: '結果', emotion_tags: ['うれしい'] }, analysis_status: 'done' } },
            headers: headers,
            as: :json

      expect(response).to have_http_status(:ok)
      expect(dream.reload.edit_version).to eq(0)
      expect(dream.analysis_status).to eq('done')
    end
  end

  context 'AIの結果を保存したとき' do
    it '画像生成の保存では版番号が進まず、生成前の版で編集を保存できる' do
      version = fetched_version
      fake_client = double('OpenAI::Client')
      allow(fake_client).to receive_message_chain(:images, :generate)
        .and_return({ 'data' => [{ 'b64_json' => 'aW1hZ2U=' }] })
      original_client = $openai_client
      begin
        $openai_client = fake_client
        post "/dreams/#{dream.id}/generate_image", params: {}.to_json,
             headers: headers.merge('Content-Type' => 'application/json')
      ensure
        $openai_client = original_client
      end
      expect(response).to have_http_status(:ok)
      expect(dream.reload.edit_version).to eq(version)

      put_edit({ title: '画像のあとで編集', content: '編集した内容' }, expected_edit_version: version)

      expect(response).to have_http_status(:ok)
    end
  end

  it '他人の夢は版番号が正しくても403のまま' do
    other_dream = create(:dream, user: create(:user))

    put "/dreams/#{other_dream.id}",
        params: { dream: { title: '奪う' }, expected_edit_version: 0 },
        headers: headers,
        as: :json

    expect(response).to have_http_status(:forbidden)
    expect(other_dream.reload.title).not_to eq('奪う')
  end
end
