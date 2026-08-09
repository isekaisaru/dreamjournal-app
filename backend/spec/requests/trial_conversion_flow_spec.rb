require 'rails_helper'

# 7月「守りのMust」ランブック ① Trial P3 の回帰テスト。
# 参照: docs/2026-07-guard-must-runbook.md
#
# 【守りたい不変条件】
# trialユーザーが通常の夢作成API（= /home の「夢を記録する」導線）でDB保存した夢は、
# convert_trial による本登録昇格のあとも、同じ夢として残り続ける。
#
# 【なぜ残るのか】
# convert_trial は新しい User を作らない。既存の User レコードの
# email / username / password を書き換えて trial_user を false にするだけ。
# dreams.user_id は最初から最後まで同じ User を指しているので、
# 「持ち主のプロフィールが書き換わった」だけで夢の所属は変わらない。
#
# 【このテストが検証対象にしないもの】
# /trial 画面の「記録だけする」と AI プレビューは React の画面内 state だけで、
# DBには保存されない。あれを引き継ぎ確認に使うと必ず失敗するが、それは
# P3 の不具合ではなく検証手順の誤り。よってここでは扱わない。
#
# 【既存テストとの違い】
# auth_spec.rb にも「昇格しても夢が引き継がれる」テストがあるが、あちらは
# factory で直接作った夢（create(:dream, user: trial_user)）を使う。
# このテストは trial_login → POST /dreams → GET /dreams という実APIの
# 通し導線で確認し、「画面から実際に操作したときに壊れていないか」を守る。
#
# 【Cookieの扱い】
# request spec の統合セッションはブラウザと同じようにCookieを保持し、
# 次のリクエストへ自動で送ってくれる。ここではその仕組みをそのまま使い、
# 実際の画面遷移に近い形で検証する（手動でCookieヘッダを組み立てない）。
RSpec.describe 'Trial P3: trialユーザーの夢が本登録後も残る導線', type: :request do
  let(:host) { { 'HOST' => 'backend' } }

  let(:trial_params) do
    {
      trial_user: {
        email: 'p3_trial@example.com',
        username: 'p3_trial',
        password: 'trial_password_123',
        password_confirmation: 'trial_password_123'
      }
    }
  end

  let(:convert_params) do
    {
      user: {
        email: 'p3_real@example.com',
        username: 'p3_real',
        password: 'real_password_123',
        password_confirmation: 'real_password_123'
      }
    }
  end

  let(:dream_params) do
    { dream: { title: 'テストP3', content: 'そらを とんで いる ゆめを みたよ。' } }
  end

  # /trial 画面で「AIにきいてみる」を押したときに実際に走るAPI
  def trial_login!
    post '/auth/trial_login', params: trial_params, as: :json, headers: host
    expect(response).to have_http_status(:created)
  end

  # /home の「夢を記録する」から夢を保存するのと同じAPI
  def create_dream!
    post '/dreams', params: dream_params, as: :json, headers: host
    expect(response).to have_http_status(:created)
    json_response['id']
  end

  def dream_ids_in_list
    get '/dreams', headers: host
    expect(response).to have_http_status(:ok)
    json_response.map { |d| d['id'] }
  end

  it 'trial_login → /dreamsでDB保存 → convert_trial のあとも同じ夢が残る' do
    # --- ① trialユーザーとしてログインする -------------------------------
    trial_login!
    expect(json_response['user']['trial_user']).to be true

    user = User.find_by(email: 'p3_trial@example.com')
    expect(user).to be_present
    user_id_before = user.id

    # --- ③ 通常の夢作成APIでDBに保存する ---------------------------------
    dream_id = nil
    expect { dream_id = create_dream! }.to change(Dream, :count).by(1)

    # 画面内stateではなく、本当にDBに入っていることを確認する
    saved_dream = Dream.find(dream_id)
    expect(saved_dream.user_id).to eq(user_id_before)
    # trial_login が self プロフィールを作るので、夢はそこに紐づく
    expect(saved_dream.dream_profile_id).to be_present

    # --- ④ 本登録の前に、一覧APIで見えている ------------------------------
    expect(dream_ids_in_list).to include(dream_id)

    # --- ⑤ 同じUserのまま本登録へ昇格する --------------------------------
    patch '/auth/convert_trial', params: convert_params, as: :json, headers: host
    expect(response).to have_http_status(:ok)

    # 昇格APIが trial_user: false を返す。
    # /home はこの値だけを見て TrialBanner の表示を決めているので、
    # これが false になること＝画面からバナーが消えること。
    # （画面側の出し分けは frontend/__tests__/app/home/page.test.tsx が担当）
    expect(json_response['user']['trial_user']).to be false
    expect(json_response['user']['id']).to eq(user_id_before)

    # --- ⑥ 本登録後も同じ夢が残っている ----------------------------------
    expect(dream_ids_in_list).to include(dream_id)

    # 新しいUserが作られていないこと（＝夢が迷子にならない理由そのもの）
    user.reload
    expect(user.id).to eq(user_id_before)
    expect(user.trial_user?).to be false
    expect(user.email).to eq('p3_real@example.com')
    expect(saved_dream.reload.user_id).to eq(user_id_before)

    # 昇格でUserが増えていないことも明示しておく
    expect(User.where(email: %w[p3_trial@example.com p3_real@example.com]).count).to eq(1)
  end

  it '昇格に失敗したときは trial のままで、保存済みの夢も消えない' do
    # メールが他ユーザーと重複していて昇格が422になるケース。
    # 「失敗しても巻き戻って夢が残る」ことも P3 の安全性の一部なので一緒に守る。
    create(:user, email: 'taken@example.com', username: 'taken_user')

    trial_login!
    user = User.find_by(email: 'p3_trial@example.com')
    dream_id = create_dream!

    patch '/auth/convert_trial',
          params: convert_params.deep_merge(user: { email: 'taken@example.com' }),
          as: :json,
          headers: host
    expect(response).to have_http_status(:unprocessable_content)

    # trial のまま維持され、保存済みの夢もそのまま残っている
    expect(user.reload.trial_user?).to be true
    expect(dream_ids_in_list).to include(dream_id)
  end
end
