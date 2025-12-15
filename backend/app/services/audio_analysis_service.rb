# frozen_string_literal: true

require "openai"

class AudioAnalysisService
  class TranscriptionError < StandardError; end
  class AnalysisError < StandardError; end

  def initialize(file_source)
    @file_source = file_source
    @client = OpenAI::Client.new(access_token: ENV.fetch("OPENAI_API_KEY"))
  end

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
    is_valid =
      if @file_source.respond_to?(:tempfile)
        true
      elsif @file_source.is_a?(File) || @file_source.class.name == "Tempfile"
        true
      elsif @file_source.is_a?(String) && File.exist?(@file_source)
        true
      else
        false
      end

    raise ArgumentError, "有効な音声ファイルが見つかりませんでした。" unless is_valid
  end

  def transcribe_audio
    # ActiveStorageの open メソッドから渡されるオブジェクトや、
    # UploadedFile, File オブジェクトなど、ソースの多様性を吸収する
    
    # 拡張子の決定ロジック
    filename = if @file_source.respond_to?(:original_filename)
                 @file_source.original_filename
               elsif @file_source.respond_to?(:path)
                 File.basename(@file_source.path)
               else
                 "audio.webm"
               end
    
    extension = File.extname(filename)
    extension = ".webm" if extension.blank?

    Tempfile.create(["upload", extension]) do |temp_file|
      temp_file.binmode

      # IOストリームの取得ロジック
      source_io = if @file_source.respond_to?(:tempfile)
                    # ActionDispatch::Http::UploadedFile の場合
                    @file_source.tempfile
                  else
                    # File, Tempfile, または IOライクなオブジェクトの場合
                    @file_source
                  end

      source_io.rewind if source_io.respond_to?(:rewind)
      IO.copy_stream(source_io, temp_file)
      temp_file.rewind

      response = @client.audio.transcribe(
        parameters: {
          model: "whisper-1",
          file: temp_file,
          response_format: "json",
          language: "ja"
        }
      )

      transcript = response["text"]&.strip
      raise TranscriptionError, "文字起こしに失敗しました" if transcript.blank?

      transcript
    end
  end

  def analyze_transcript(text)
    system_prompt = <<~PROMPT
      あなたは心理学者の夢分析AIです。出力は必ず以下のJSONフォーマットに従ってください。
      {
        "analysis": "心理学的な分析とアドバイスを丁寧に。",
        "emotion_tags": ["感情1", "感情2"]
      }
    PROMPT

    response = @client.chat(
      parameters: {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: "夢の内容: #{text}" }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }
    )

    content = response.dig("choices", 0, "message", "content")
    parsed = JSON.parse(content) rescue nil

    raise AnalysisError, "分析結果の解析に失敗しました。" unless parsed.is_a?(Hash)

    {
      analysis: parsed["analysis"].to_s,
      emotion_tags: Array(parsed["emotion_tags"])
    }
  rescue OpenAI::Error => e
    Rails.logger.error e.message
    raise AnalysisError, "AIとの通信に失敗しました。"
  end
end
