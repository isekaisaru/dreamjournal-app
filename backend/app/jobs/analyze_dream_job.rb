class AnalyzeDreamJob < ApplicationJob
  queue_as :default

  # 失敗した場合は指数関数的に時間を空けて3回までリトライ
  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(dream_id)
    dream = Dream.find(dream_id)

    # 音声ファイルが添付されていて、かつ本文が未設定（またはプレースホルダー）の場合は音声解析を行う
    if dream.audio.attached? && (dream.content.blank? || dream.content == "音声解析中...")
      process_audio_dream(dream)
    elsif dream.content.present?
      process_text_dream(dream)
    else
      dream.mark_failed!('分析対象の夢の内容がありません。')
    end
  end

  private

  def process_audio_dream(dream)
    # OpenAI 呼び出し（Whisper + GPT）— ここが課金対象
    user = dream.user
    result = nil
    dream.audio.open do |file|
      result = AudioAnalysisService.new(
        file,
        age_group:     user&.age_group     || "child",
        analysis_tone: user&.analysis_tone || "auto"
      ).call
    end

    # 文字起こしが Dream.content の上限（1000文字）を超える場合は切り詰め
    transcript = (result[:transcript] || "").truncate(1000)
    result[:transcript] = transcript

    # DB保存 — OpenAI 呼び出し後の保存失敗ではリトライしない
    # （リトライすると同じ音声で再課金される）
    begin
      dream.content = transcript
      save_analysis_result(dream, result)
    rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotSaved => e
      Rails.logger.error "Audio dream save failed after OpenAI call: #{e.message}"
      dream.mark_failed!("分析は完了しましたが保存に失敗しました: #{e.message}")
      # ここでは raise しない — OpenAI 再課金を防ぐ
    end
  rescue AudioAnalysisService::TranscriptionError, AudioAnalysisService::AnalysisError => e
    # OpenAI 呼び出し自体の失敗はリトライ対象
    dream.mark_failed!("音声解析中にエラーが発生しました: #{e.message}")
    raise e
  rescue StandardError => e
    dream.mark_failed!("音声解析中に予期せぬエラーが発生しました: #{e.message}")
    raise e
  end

  def process_text_dream(dream)
    user = dream.user
    result = DreamAnalysisService.analyze(
      dream.content,
      age_group:     user&.age_group     || "child",
      analysis_tone: user&.analysis_tone || "auto"
    )

    if result[:error]
      dream.update!(analysis_status: "failed", analysis_json: { error: result[:error] })
    else
      save_analysis_result(dream, result)
    end
  end

  def save_analysis_result(dream, result)
    # emotion_tagsなどを保存するロジックが必要ならここに追加
    # 現状の実装に合わせる
    dream.update!(
      title: (result[:transcript] || dream.content)[0..20], # タイトルが仮の場合は更新してもいいかも
      content: result[:transcript] || dream.content,
      analysis_status: "done",
      analysis_json: result,
      analyzed_at: Time.current
    )
  end
end
