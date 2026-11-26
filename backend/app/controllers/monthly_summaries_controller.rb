class MonthlySummariesController < ApplicationController
  YEAR_MONTH_FORMAT = /\A\d{4}-(0[1-9]|1[0-2])\z/
  MONTHLY_SUMMARY_LIMIT = 3

  # OpenAI を呼ぶ AI 課金系のため、dreams#analyze / audio_dreams と同様にメール確認を必須にする。
  # 月次カウント（AiUsageLog）や OpenAI 呼び出しより前に拒否する。
  before_action :require_verified_email, only: [:create]

  def create
    unless current_user.premium?
      return render json: { error: 'プレミアム会員のみご利用いただけます。' }, status: :forbidden
    end

    year_month = params[:year_month]
    unless year_month&.match?(YEAR_MONTH_FORMAT)
      return render json: { error: '年月の形式が正しくありません（YYYY-MM）。' }, status: :bad_request
    end

    # 上限チェックと記録を、ユーザー行のロックの中でまとめて行う。
    # AI を呼ぶ前に 1 回分の枠を取っておくので、同時に何回押されても上限をこえない。
    # ロックは数えて記録を作るあいだだけで、時間のかかる AI 呼び出しはロックの外で行う。
    monthly_count = nil
    usage_log = current_user.with_lock do
      monthly_count = AiUsageLog.this_month_for_user(current_user, 'monthly_summary').count
      next nil if monthly_count >= MONTHLY_SUMMARY_LIMIT

      AiUsageLog.create!(user: current_user, feature: 'monthly_summary')
    end

    unless usage_log
      return render json: {
        error: "今月の月次サマリー上限（#{MONTHLY_SUMMARY_LIMIT}回）に達しました。来月またお試しください。",
        limit_reached: true,
        monthly_summary_count: monthly_count,
        monthly_summary_limit: MONTHLY_SUMMARY_LIMIT
      }, status: :too_many_requests
    end

    begin
      result = MonthlySummaryService.generate(current_user, year_month)
    rescue StandardError
      usage_log.destroy!
      raise
    end

    if result[:error]
      # 作れなかった回は数えない（先に取った枠を返す）
      usage_log.destroy!
      status = result[:error].include?('夢がありません') ? :not_found : :internal_server_error
      return render json: { error: result[:error] }, status: status
    end

    render json: { summary: result[:summary] }, status: :ok
  end
end
