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
    dream.audio.open do |file|
      # ActiveStorageの一時ファイルをサービスに渡す
      result = AudioAnalysisService.new(file).call
      
      # 文字起こし結果で本文を更新
      dream.content = result[:transcript]
      
      # 結果を保存
      save_analysis_result(dream, result)
    end
  rescue StandardError => e
    dream.mark_failed!("音声解析中にエラーが発生しました: #{e.message}")
    raise e # リトライのために再スロー
  end

  def process_text_dream(dream)
    result = DreamAnalysisService.analyze(dream.content)
    
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
