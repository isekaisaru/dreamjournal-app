# frozen_string_literal: true

class AudioDreamsController < ApplicationController

  def create
    # 1.音声解析サービスの呼び出し
    # result には Whisperからの応答テキスト（"transcript"）や、AI分析の結果などが含まれる
    result = AudioAnalysisService.new(params[:file]).call

    # 2. 結果をJSONで返す (DB保存は行わない)
    # フロントエンドがこの結果を受け取り、確認画面を経て /dreams (DreamsController#create) にPOSTする
    render json: result, status: :ok

  # サービスからの特定の、予期されるエラーを処理するg
  rescue ArgumentError => e
    render json: { error: e.message }, status: :bad_request
  rescue AudioAnalysisService::TranscriptionError => e
    # 警告をログに記録し、ユーザーフレンドリーなエラーを返す
    Rails.logger.warn "Audio transcription failed: #{e.message}"
    render json: { error: e.message }, status: :unprocessable_content # 422
  rescue AudioAnalysisService::AnalysisError => e
    Rails.logger.error "Audio analysis failed: #{e.message}"
    render json: { error: e.message }, status: :bad_gateway # 502
  rescue OpenAI::Error => e
    Rails.logger.error "OpenAI API error: #{e.class} - #{e.message}"
    render json: { error: "AIサービスの呼び出しに失敗しました。" }, status: :bad_gateway # 502
  rescue StandardError => e
    Rails.logger.error "AudioDreamsController#create error: #{e.class} - #{e.message}\n#{e.backtrace.join("\n")}"
    render json: { error: "音声解析処理中にエラーが発生しました。" }, status: :internal_server_error
  end
end
