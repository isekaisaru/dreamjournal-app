# backend/app/services/dream_analysis_service.rb
require 'openai'

class DreamAnalysisService
  # 夢の内容を分析するクラスメソッド
  # age_group / analysis_tone はユーザー設定から渡す。省略時は子ども向けデフォルト。
  def self.analyze(dream_content, age_group: "child", analysis_tone: "auto")
    begin
      api_key = ENV["OPENAI_API_KEY"].presence
      unless api_key
        Rails.logger.error "DreamAnalysisService: OPENAI_API_KEY is not configured"
        return { error: "AI分析サービスの設定が不足しています。時間をおいてもう一度お試しください。" }
      end

      client = $openai_client || OpenAI::Client.new(access_token: api_key, request_timeout: 55)

      resolved_tone = TonePromptBuilder.resolve_tone(age_group: age_group, analysis_tone: analysis_tone)
      Rails.logger.info("DreamAnalysisService: tone=#{resolved_tone} (age_group=#{age_group}, analysis_tone=#{analysis_tone})")
      system_prompt = TonePromptBuilder.build(age_group: age_group, analysis_tone: analysis_tone)

      response = client.chat(parameters: {
        model: ENV["OPENAI_CHAT_MODEL"].presence || "gpt-4o-mini",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: "夢の内容: #{dream_content}" }
        ],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: "json_object" }
      })

      content = response.dig("choices", 0, "message", "content")

      if content.nil?
        Rails.logger.error "OpenAI API returned nil content. Response: #{response.to_json}"
        return { error: "AIからの応答が空でした。APIキーを確認してください。" }
      end

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
