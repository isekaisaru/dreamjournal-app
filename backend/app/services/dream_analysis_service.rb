# backend/app/services/dream_analysis_service.rb
require 'openai'

class DreamAnalysisService
  # OpenAI APIキーを設定
  OpenAI.configure do |config|
    config.access_token = ENV.fetch('OPENAI_API_KEY')
  end

  # 夢の内容を分析するクラスメソッド
  def self.analyze(dream_content)
    # プロンプトを通常の文字列で定義
    prompt = "以下の夢の内容を分析し、心理学的な観点や象徴的な意味合いを踏まえて、夢を見た人へのアドバイスや気づきを与えてください。結果は簡潔かつ分かりやすく記述してください。\n\n夢の内容:\n#{dream_content}\n\n分析結果とアドバイス:"

    begin
      # OpenAI API (Chat Completion) を呼び出す
      client = OpenAI::Client.new
      response = client.chat(
        parameters: {
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 300
        }
      )

      # レスポンスから分析結果を取得
      analysis_result = response.dig("choices", 0, "message", "content")&.strip

      if analysis_result
        { analysis: analysis_result }
      else
        Rails.logger.error "OpenAI APIからのレスポンス形式が不正です: #{response.inspect}"
        { error: "分析結果を取得できませんでした。" }
      end

    rescue Faraday::ConnectionFailed => e
      Rails.logger.error "OpenAI APIへの接続に失敗しました: #{e.message}"
      { error: "分析サービスへの接続に失敗しました。時間をおいて再度お試しください。" }
    rescue Faraday::TimeoutError => e
      Rails.logger.error "OpenAI APIへの接続がタイムアウトしました: #{e.message}"
      { error: "分析サービスが時間内に応答しませんでした。時間をおいて再度お試しください。" }
    rescue OpenAI::Error => e
      Rails.logger.error "OpenAI APIエラーが発生しました: #{e.message}"
      { error: "夢の分析中にエラーが発生しました。(#{e.message})" }
    rescue StandardError => e
      Rails.logger.error "予期せぬエラーが発生しました: #{e.message}\n#{e.backtrace.join("\n")}"
      { error: "分析中に予期せぬエラーが発生しました。" }
    end # begin...rescue...end の end
  end # def self.analyze の end
end # class DreamAnalysisService の end