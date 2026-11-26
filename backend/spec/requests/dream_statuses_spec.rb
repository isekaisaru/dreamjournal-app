require 'rails_helper'

# GET /dreams/statuses は、分析待ちの夢の状態をまとめて返す。
# 画面が一度に問い合わせるのは分析待ちの夢だけなので、
# 件数が多すぎる・形がおかしい ids は 400 で断り、大きすぎる問い合わせを DB に流さない。
RSpec.describe 'GET /dreams/statuses', type: :request do
  let!(:user) { create(:user, :with_self_profile) }
  let!(:other_user) { create(:user, :with_self_profile) }
  let!(:dream) { create(:dream, user: user, analysis_status: 'pending') }
  let!(:other_dream) { create(:dream, user: other_user, analysis_status: 'done') }

  it '自分の夢の状態だけを返す' do
    authenticated_get('/dreams/statuses', user, params: { ids: "#{dream.id},#{other_dream.id}" })

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)).to eq(dream.id.to_s => 'pending')
  end

  it '101 件以上の ids は 400 を返す' do
    ids = (1..101).to_a.join(',')
    authenticated_get('/dreams/statuses', user, params: { ids: ids })

    expect(response).to have_http_status(:bad_request)
  end

  it '数字のカンマ区切りでない ids は 400 を返す' do
    authenticated_get('/dreams/statuses', user, params: { ids: "#{dream.id},abc" })

    expect(response).to have_http_status(:bad_request)
  end
end
