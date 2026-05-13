require 'rails_helper'

RSpec.describe 'MonthlySummaries API', type: :request do
  describe 'POST /dreams/month/:year_month/ai_summary' do
    it_behaves_like 'unauthorized request', :post, '/dreams/month/2026-04/ai_summary'

    context '非プレミアム会員の場合' do
      it '403 を返す' do
        user = create(:user, premium: false)

        authenticated_post '/dreams/month/2026-04/ai_summary', user

        expect(response).to have_http_status(:forbidden)
        expect(JSON.parse(response.body)['error']).to include('プレミアム会員のみ')
      end
    end

    context '不正な year_month フォーマットの場合' do
      it '文字列は 400 を返す' do
        user = create(:user, premium: true)

        authenticated_post '/dreams/month/invalid/ai_summary', user

        expect(response).to have_http_status(:bad_request)
      end

      it '月が 00 は 400 を返す' do
        user = create(:user, premium: true)

        authenticated_post '/dreams/month/2026-00/ai_summary', user

        expect(response).to have_http_status(:bad_request)
      end

      it '月が 13 は 400 を返す' do
        user = create(:user, premium: true)

        authenticated_post '/dreams/month/2026-13/ai_summary', user

        expect(response).to have_http_status(:bad_request)
      end
    end

    context 'プレミアム会員・対象月に夢がない場合' do
      it '404 を返す' do
        user = create(:user, premium: true)

        allow(MonthlySummaryService).to receive(:generate)
          .and_return({ error: 'この月に夢がありません。' })

        authenticated_post '/dreams/month/2026-04/ai_summary', user

        expect(response).to have_http_status(:not_found)
      end
    end

    context 'プレミアム会員・正常系' do
      it '200 と summary を返す' do
        user = create(:user, premium: true)

        allow(MonthlySummaryService).to receive(:generate)
          .and_return({ summary: 'モルペウスの月次サマリーテスト文章' })

        authenticated_post '/dreams/month/2026-04/ai_summary', user

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['summary']).to eq('モルペウスの月次サマリーテスト文章')
      end

      it '成功時に ai_usage_log が 1 件増える' do
        user = create(:user, premium: true)

        allow(MonthlySummaryService).to receive(:generate)
          .and_return({ summary: 'テスト' })

        expect {
          authenticated_post '/dreams/month/2026-04/ai_summary', user
        }.to change { AiUsageLog.where(user: user, feature: 'monthly_summary').count }.by(1)
      end
    end

    context 'プレミアム会員・月次サマリーのフェアユース制限' do
      it '今月2回利用済みでも 200 を返す' do
        user = create(:user, premium: true)
        create_list(:ai_usage_log, 2, user: user, feature: 'monthly_summary')

        allow(MonthlySummaryService).to receive(:generate)
          .and_return({ summary: 'テスト' })

        authenticated_post '/dreams/month/2026-04/ai_summary', user

        expect(response).to have_http_status(:ok)
      end

      it '今月3回達成で 429 を返す' do
        user = create(:user, premium: true)
        create_list(:ai_usage_log, 3, user: user, feature: 'monthly_summary')

        authenticated_post '/dreams/month/2026-04/ai_summary', user

        expect(response).to have_http_status(:too_many_requests)
        body = JSON.parse(response.body)
        expect(body['limit_reached']).to be true
        expect(body['monthly_summary_limit']).to eq(3)
      end

      it '先月のログは今月の制限にカウントしない' do
        user = create(:user, premium: true)
        create_list(:ai_usage_log, 3, user: user, feature: 'monthly_summary',
                    created_at: 1.month.ago)

        allow(MonthlySummaryService).to receive(:generate)
          .and_return({ summary: 'テスト' })

        authenticated_post '/dreams/month/2026-04/ai_summary', user

        expect(response).to have_http_status(:ok)
      end
    end

    context 'サービスがエラーを返す場合' do
      it '500 を返す' do
        user = create(:user, premium: true)

        allow(MonthlySummaryService).to receive(:generate)
          .and_return({ error: 'AIサービスとの通信に失敗しました。' })

        authenticated_post '/dreams/month/2026-04/ai_summary', user

        expect(response).to have_http_status(:internal_server_error)
      end
    end
  end
end
