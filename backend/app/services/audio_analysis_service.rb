# frozen_string_literal: true

require "openai"

# app/services/audio_analysis_service.rb
class AudioAnalysisService
  class TranscriptionError < StandardError; end
  class AnalysisError < StandardError; end

  # @param file_source [ActionDispatch::Http::UploadedFile, File, String] 音声ファイル
  def initialize(file_source)
    @file_source = file_source
    # クライアントはサービスインスタンスごとに一度だけ初期化する
    @client = OpenAI::Client.new(access_token: ENV.fetch("OPENAI_API_KEY"))
  end

  # 文字起こしと分析のプロセスを実行します。
  # @return [Hash] :transcript, :analysis, :emotion_tags を含むハッシュ
  # @raise [ArgumentError] ファイルが無効な場合
  # @raise [TranscriptionError] 文字起こしに失敗した場合
  # @raise [AnalysisError] 分析に失敗した場合
  def call
    validate_file!

    transcript_text = transcribe_audio
    analysis_data = analyze_transcript(transcript_text)

    {
      transcript: transcript_text,
      analysis: analysis_data[:analysis],
      emotion_tags: analysis_data[:emotion_tags]
    }
  end

  private

  def validate_file!
    # UploadedFile, File, Tempfile, またはファイルパス(String)のいずれかを受け入れる
    is_valid = if @file_source.respond_to?(:tempfile)
                 true
               elsif @file_source.is_a?(File) || @file_source.class.name == 'Tempfile'
                 true
               elsif @file_source.is_a?(String) && File.exist?(@file_source)
                 true
               else
                 false
               end
    raise ArgumentError, "有効な音声ファイルが見つかりませんでした。" unless is_valid
  end

  def transcribe_audio
    # ファイルオブジェクトを取得
    file_object = if @file_source.respond_to?(:tempfile)
                    @file_source.tempfile
                  elsif @file_source.is_a?(String)
                    File.open(@file_source)
                  else
                    @file_source
                  end

    # もしFileオブジェクトなら rewind しておく(念のため)
    file_object.rewind if file_object.respond_to?(:rewind)

    response = @client.audio.transcribe(parameters: {
      model: "whisper-1",
      file: file_object,
      response_format: "json",
      language: "ja"
    })

    Rails.logger.info "Whisper Response: #{response.inspect}"

    transcript = response["text"]&.strip
    # 文字起こし結果が空の場合、専用のエラーを発生させる
    raise TranscriptionError, "音声の文字起こしに失敗しました。音声が短すぎるか無音の可能性があります。" if transcript.blank?

    transcript
  end

  def analyze_transcript(text)
    system_prompt = <<~'PROMPT'
      あなたは心理学者の夢分析AIです。出力は必ず以下のJSONフォーマットに従ってください。
      {
        "analysis": "心理学的な分析とアドバイスを丁寧に。",
        "emotion_tags": ["感情1", "感情2", "感情3"]
      }
      emotion_tags には夢から読み取れる主要な感情を日本語で1〜3個だけ含めてください。省略記号やプレースホルダーは出力しないでください。
    PROMPT

    response = @client.chat(parameters: {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: "夢の内容: #{text}" }
      ],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" }
    })

    content = response.dig("choices", 0, "message", "content")
    parsed = JSON.parse(content) rescue nil

    raise AnalysisError, "AIによる分析結果の解析に失敗しました。" unless parsed.is_a?(Hash)

    {
      analysis: parsed["analysis"].to_s.presence || "AI分析結果を取得できませんでした。",
      emotion_tags: parsed["emotion_tags"].is_a?(Array) ? parsed["emotion_tags"].map(&:to_s) : []
    }
  rescue OpenAI::Error => e
    Rails.logger.error "OpenAI API error during analysis: #{e.class} - #{e.message}"
    raise AnalysisError, "AIサービスとの通信に失敗しました。"
  end
end