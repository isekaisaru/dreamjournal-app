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
    result[:analysis] ? dream.mark_done!(text: result[:analysis]) : dream.mark_failed!(result[:error] || '不明なエラー')
  end
end
