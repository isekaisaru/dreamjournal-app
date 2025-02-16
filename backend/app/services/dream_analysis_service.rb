require 'openai'

class DreamAnalysisService
  def self.analyze(content)
    return { error: "夢の内容が空です。" } if content.blank?

    begin
      client = OpenAI::Client.new(access_token: ENV.fetch('OPENAI_API_KEY'))
      response = client.chat(
        parameters: {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "あなたは夢分析の専門家です。ユーザーの夢を解釈し、テーマや感情、考えられる意味について教えてください。" },
            { role: "user", content: content }
          ],
          max_tokens: 1500
        }
      )

      analysis = response&.dig("choices", 0, "message", "content")
      analysis.present? ? { analysis: analysis } : { error: "夢の分析に失敗しました。" }
    rescue StandardError => e
      Rails.logger.error "Error in DreamAnalysisService: #{e.message}"
      { error: "予期しないエラーが発生しました: #{e.message}" }
    end
  end
end