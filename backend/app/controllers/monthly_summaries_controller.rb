class MonthlySummariesController < ApplicationController
  YEAR_MONTH_FORMAT = /\A\d{4}-\d{2}\z/

  def create
    unless current_user.premium?
      return render json: { error: 'プレミアム会員のみご利用いただけます。' }, status: :forbidden
    end

    year_month = params[:year_month]
    unless year_month&.match?(YEAR_MONTH_FORMAT)
      return render json: { error: '年月の形式が正しくありません（YYYY-MM）。' }, status: :bad_request
    end

    result = MonthlySummaryService.generate(current_user, year_month)

    if result[:error]
      status = result[:error].include?('夢がありません') ? :not_found : :internal_server_error
      return render json: { error: result[:error] }, status: status
    end

    render json: { summary: result[:summary] }, status: :ok
  end
end
