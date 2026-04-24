# frozen_string_literal: true

class AudioDreamsController < ApplicationController
  before_action :check_trial_audio_limit, only: [:create]

  TRIAL_AUDIO_LIMIT = 1 # トライアルユーザーの音声分析上限（Whisper+GPTで高コスト）

  def create
    # ユーザー認証: トークンからcurrent_userを取得するロジックが必要
    # ApplicationControllerでcurrent_userがセットされている前提
    # なければ User.first (仮: 開発用) またはエラーにする
    user = current_user || User.first 

    # 1. Dreamレコードを作成 (ステータス: pending)
    dream = user.dreams.new(
      title: "音声記録 #{Time.current.strftime('%Y/%m/%d %H:%M')}",
      content: "音声解析中...",
      analysis_status: :pending
    )

    # 2. 音声ファイルを添付
    if params[:file].present?
      dream.audio.attach(params[:file])
    else
      render json: { error: "音声ファイルが必要です" }, status: :bad_request
      return
    end

    if dream.save
      user.increment!(:trial_audio_count) if user.trial_user?

      # 3. ジョブをエンキュー (非同期処理)
      AnalyzeDreamJob.perform_later(dream.id)

      # 4. 即座にレスポンスを返す
      render json: { 
        id: dream.id, 
        message: "音声を受け付けました。解析を開始します。",
        status: "pending"
      }, status: :ok
    else
      render json: { error: dream.errors.full_messages }, status: :unprocessable_entity
    end
  rescue StandardError => e
    Rails.logger.error "AudioDreamsController#create error: #{e.class} - #{e.message}"
    render json: { error: "処理中にエラーが発生しました。" }, status: :internal_server_error
  end

  private

  # トライアルユーザーの音声分析回数チェック
  # 音声分析は Whisper + GPT で二重課金されるため厳しめに制限
  def check_trial_audio_limit
    user = current_user
    return if user&.premium?
    return unless user&.trial_user?

    if user.trial_audio_count >= TRIAL_AUDIO_LIMIT
      render json: {
        error: "トライアルユーザーの音声分析上限（#{TRIAL_AUDIO_LIMIT}回）に達しました。アカウント登録すると無制限に利用できます。",
        limit_reached: true
      }, status: :forbidden
    end
  end
end
