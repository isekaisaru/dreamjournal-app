require 'openai'

class MonthlySummaryService
  SYSTEM_PROMPT = <<~PROMPT.freeze
    あなたはユメログのキャラクター「モルペウス」です。
    ユーザーが1ヶ月間に記録した夢を振り返り、温かくやさしいメッセージを日本語で生成してください。

    ルール：
    - 子どもでも読めるやさしいことばを使う（ひらがな多め）
    - 3〜5文程度のまとまったメッセージにする
    - 夢の内容にある感情・テーマを拾って言及する
    - 記録を続けたことをやさしくほめる
    - 必ずJSON形式で返す: {"summary": "..."}
  PROMPT

  def self.generate(user, year_month)
    year, month = year_month.split('-').map(&:to_i)
    start_date = Time.zone.local(year, month, 1)
    end_date = start_date.end_of_month

    dreams = user.dreams.where(created_at: start_date..end_date).order(:created_at)
    return { error: 'この月に夢がありません。' } if dreams.empty?

    analyzed = dreams.select { |d| d.analysis_json&.dig('analysis').present? }

    dream_entries = if analyzed.any?
      analyzed.first(10).map.with_index(1) do |dream, i|
        analysis = dream.analysis_json['analysis'].to_s.truncate(120)
        "#{i}. 「#{dream.title}」: #{analysis}"
      end
    else
      dreams.first(5).map.with_index(1) do |dream, i|
        "#{i}. 「#{dream.title}」"
      end
    end

    month_label = "#{year}年#{month}月"
    prompt = <<~MSG
      #{month_label}のゆめ記録（#{dreams.count}こ）:
      #{dream_entries.join("\n")}

      この月の夢を振り返って、モルペウスとしてやさしいひとことを送ってください。
    MSG

    client = $openai_client
    unless client
      Rails.logger.error "MonthlySummaryService: OPENAI_API_KEY is not configured"
      return { error: "AI分析サービスの設定が不足しています。時間をおいてもう一度お試しください。" }
    end

    response = client.chat(parameters: {
      model: ENV["OPENAI_CHAT_MODEL"].presence || "gpt-4o-mini",
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 400,
      response_format: { type: 'json_object' }
    })

    content = response.dig('choices', 0, 'message', 'content')
    return { error: 'AIからの応答が空でした。' } if content.nil?

    parsed = JSON.parse(content)
    { summary: parsed['summary'].to_s.presence || '分析結果を取得できませんでした。' }

  rescue JSON::ParserError => e
    Rails.logger.error "MonthlySummaryService JSON error: #{e.message}"
    { error: 'AIからの応答が不正な形式でした。' }
  rescue OpenAI::Error => e
    Rails.logger.error "MonthlySummaryService OpenAI error: #{e.message}"
    { error: 'AIサービスとの通信に失敗しました。' }
  rescue StandardError => e
    Rails.logger.error "MonthlySummaryService error: #{e.class} - #{e.message}"
    { error: '月次サマリーの生成中にエラーが発生しました。' }
  end
end
