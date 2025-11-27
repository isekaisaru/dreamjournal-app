# frozen_string_literal: true

class AnalyzeAudioDreamJob < ApplicationJob
  queue_as :default

  # @param dream_id [Integer] 分析対象の夢のID
  def perform(dream_id)
    dream = Dream.find_by(id: dream_id)
    return unless dream
    return unless dream.audio_attachment.attached?

    # Active Storageのファイルを一時ファイルとしてダウンロード
    dream.audio_attachment.open do |tempfile|
      # ActionDispatch::Http::UploadedFileのインスタンスを模倣してServiceに渡す
      uploaded_file = ActionDispatch::Http::UploadedFile.new(
        tempfile: tempfile,
        filename: dream.audio_attachment.filename.to_s,
        type: dream.audio_attachment.content_type
      )

      result = AudioAnalysisService.new(uploaded_file).call
      # 成功したら、文字起こし結果をcontentに、分析結果をanalysis_jsonに保存
      dream.update!(content: result[:transcript], analysis_json: result, analysis_status: 'done', analyzed_at: Time.current)
    end
  rescue StandardError => e
    dream&.update(analysis_status: 'failed', analysis_json: { error: e.message })
  end
end