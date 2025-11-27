class AnalyzeDreamJob < ApplicationJob
  queue_as :default

  # 失敗した場合は指数関数的に時間を空けて3回までリトライ
  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(dream_id)
    dream = Dream.find(dream_id)

    # contentがない場合は失敗として記録
    unless dream.content.present?
      dream.mark_failed!('分析対象の夢の内容がありません。')
      return
    end

    result = DreamAnalysisService.analyze(dream.content)

    if result[:error]
      dream.update!(analysis_status: "failed", analysis_json: { error: result[:error] })
    else
      dream.update!(
        analysis_status: "done",
        analysis_json: result,
        analyzed_at: Time.current
      )
    end
  end
end
