# backend/app/services/dream_analysis_service.rb
require 'openai'

class DreamAnalysisService
  # 夢の内容を分析するクラスメソッド
  def self.analyze(dream_content)
    client = OpenAI::Client.new(access_token: ENV.fetch("OPENAI_API_KEY"))

    system_prompt = <<~'PROMPT'
      あなたは心理学者の夢分析AIです。出力は必ず以下のJSONフォーマットに従ってください。
      {
        "analysis": "心理学的な分析とアドバイスを丁寧に。",
        "emotion_tags": ["感情1", "感情2", "感情3"]
      }
      emotion_tags には夢から読み取れる主要な感情を日本語で1〜3個だけ含めてください。省略記号やプレースホルダーは出力しないでください。
    PROMPT

    begin
      response = client.chat(parameters: {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: "夢の内容: #{dream_content}" }
        ],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: "json_object" }
      })

      content = response.dig("choices", 0, "message", "content")
      parsed = JSON.parse(content)

      unless parsed.is_a?(Hash)
        Rails.logger.error "AI analysis result is not a hash: #{parsed.inspect}"
        return { error: "AIによる分析結果の解析に失敗しました。" }
      end

      {
        analysis: parsed["analysis"].to_s.presence || "AI分析結果を取得できませんでした。",
        emotion_tags: parsed["emotion_tags"].is_a?(Array) ? parsed["emotion_tags"].map(&:to_s) : []
      }

    rescue JSON::ParserError => e
      Rails.logger.error "JSON parsing failed: #{e.message}"
      { error: "AIからの応答が不正な形式でした。" }
    rescue OpenAI::Error => e
      Rails.logger.error "OpenAI API error: #{e.class} - #{e.message}"
      { error: "AIサービスとの通信に失敗しました。" }
    rescue StandardError => e
      Rails.logger.error "Unexpected error in DreamAnalysisService: #{e.class} - #{e.message}\n#{e.backtrace.join("\n")}"
      { error: "分析中に予期せぬエラーが発生しました。" }
    end
  end
end