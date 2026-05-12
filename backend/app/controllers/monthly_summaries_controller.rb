class MonthlySummariesController < ApplicationController
  YEAR_MONTH_FORMAT = /\A\d{4}-(0[1-9]|1[0-2])\z/
  MONTHLY_SUMMARY_LIMIT = 3

  def create
    unless current_user.premium?
      return render json: { error: 'プレミアム会員のみご利用いただけます。' }, status: :forbidden
    end

    year_month = params[:year_month]
    unless year_month&.match?(YEAR_MONTH_FORMAT)
      return render json: { error: '年月の形式が正しくありません（YYYY-MM）。' }, status: :bad_request
    end

    monthly_count = AiUsageLog.this_month_for_user(current_user, 'monthly_summary').count
    if monthly_count >= MONTHLY_SUMMARY_LIMIT
      return render json: {
        error: "今月の月次サマリー上限（#{MONTHLY_SUMMARY_LIMIT}回）に達しました。来月またお試しください。",
        limit_reached: true,
        monthly_summary_count: monthly_count,
        monthly_summary_limit: MONTHLY_SUMMARY_LIMIT
      }, status: :too_many_requests
    end

    result = MonthlySummaryService.generate(current_user, year_month)

    if result[:error]
      status = result[:error].include?('夢がありません') ? :not_found : :internal_server_error
      return render json: { error: result[:error] }, status: status
    end

    AiUsageLog.create!(user: current_user, feature: 'monthly_summary')

    render json: { summary: result[:summary] }, status: :ok
  end
end
