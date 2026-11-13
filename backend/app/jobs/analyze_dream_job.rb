class AnalyzeDreamJob < ApplicationJob
  queue_as :default

  # AudioDreamsController#create が音声の夢を作るときに入れる仮の本文
  AUDIO_PLACEHOLDER_CONTENT = "音声解析中...".freeze

  # 失敗した場合は指数関数的に時間を空けて3回までリトライ
  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(dream_id)
    dream = Dream.find(dream_id)

    # 音声ファイルが添付されていて、かつ本文が未設定（またはプレースホルダー）の場合は音声解析を行う
    if dream.audio.attached? && awaiting_transcript?(dream)
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
      save_audio_result(dream, result)
    rescue ActiveRecord::RecordNotFound
      # OpenAI を待つ間に夢が削除された。保存先がないので終える（リトライすると再課金される）
      Rails.logger.warn "[AnalyzeDreamJob] dream deleted during audio analysis dream_id=#{dream.id}"
    rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotSaved => e
      Rails.logger.error "Audio dream save failed after OpenAI call: #{e.message}"
      # 保存できなかった代入を捨ててから記録する（残すと mark_failed! も同じ検証で失敗する）
      dream.reload.mark_failed!("分析は完了しましたが保存に失敗しました: #{e.message}")
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
      # タイトルと本文は利用者のもの。分析結果の列だけを書く（分析中の利用者の編集を上書きしない）
      dream.mark_done!(result)
    end
  end

  # 書き起こしは、本文がまだ仮文のときだけ本文に入れる。
  # OpenAI を待つ間に利用者が本文を直していたら、その本文を残して分析結果だけを保存する。
  # タイトルは書き換えない（Issue #561）。
  def save_audio_result(dream, result)
    dream.with_lock do # 最新の行を読み直してロックし、利用者の保存と比較・書き込みの間に割り込ませない
      if awaiting_transcript?(dream)
        dream.content = result[:transcript]
        dream.edit_version += 1 # 本文が変わるので編集の版を進める（古い画面からの保存を409にする）
      end
      dream.update!(analysis_status: "done", analysis_json: result, analyzed_at: Time.current)
    end
  end

  def awaiting_transcript?(dream)
    dream.content.blank? || dream.content == AUDIO_PLACEHOLDER_CONTENT
  end
end
