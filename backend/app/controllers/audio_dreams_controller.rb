# frozen_string_literal: true

class AudioDreamsController < ApplicationController
  # 音声分析はWhisper+GPTの二重課金のため、メール確認済みユーザーのみ（trialは対象外）
  before_action :require_verified_email, only: [:create]
  before_action :check_audio_limit, only: [:create]

  TRIAL_AUDIO_LIMIT = 1 # トライアルユーザーの音声分析上限（Whisper+GPTで高コスト）
  FREE_AUDIO_MONTHLY_LIMIT = 5 # 無料プラン（本登録・非プレミアム）の音声分析の月上限

  # GET /audio_quota
  # 録音を始める前に残り回数を出すために使う（録音してから断ると、話した夢が失われるため）
  def quota
    user = current_user
    if user.premium?
      render json: { unlimited: true, used: nil, limit: nil, remaining: nil }
    elsif user.trial_user?
      render json: {
        trial: true,
        used: user.trial_audio_count,
        limit: TRIAL_AUDIO_LIMIT,
        remaining: [TRIAL_AUDIO_LIMIT - user.trial_audio_count, 0].max
      }
    else
      used = monthly_audio_count(user)
      render json: {
        used: used,
        limit: FREE_AUDIO_MONTHLY_LIMIT,
        remaining: [FREE_AUDIO_MONTHLY_LIMIT - used, 0].max
      }
    end
  end

  def create
    user = current_user
    unless user
      render json: { error: "認証されていません。ログインしてください。" }, status: :unauthorized
      return
    end

    # 1. Dreamレコードを作成 (ステータス: pending)
    dream = user.dreams.new(
      title: "音声記録 #{Time.current.strftime('%Y/%m/%d %H:%M')}",
      content: "音声解析中...",
      analysis_status: :pending
    )
    dream.dream_profile_id ||= user.self_dream_profile_id

    # 2. 音声ファイルを添付
    if params[:file].present?
      dream.audio.attach(params[:file])
    else
      render json: { error: "音声ファイルが必要です" }, status: :bad_request
      return
    end

    if dream.save
      user.increment!(:trial_audio_count) if user.trial_user?
      # 無料プランの月上限の数え方と、原価の把握に使う（プレミアムも記録する）
      record_audio_usage_log(user)

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

  # 音声分析の回数チェック
  # 音声分析は Whisper + GPT で二重課金されるため、プレミアム以外は回数を制限する。
  # premium? を先に見る: trial→課金後は premium: true, trial_user: true になり得るため
  def check_audio_limit
    user = current_user
    return if user.nil? || user.premium?

    if user.trial_user?
      return if user.trial_audio_count < TRIAL_AUDIO_LIMIT

      render json: {
        error: "お試しの音声記録（#{TRIAL_AUDIO_LIMIT}回）を使い切りました。アカウント登録すると、無料プランでも月#{FREE_AUDIO_MONTHLY_LIMIT}回まで使えます。",
        limit_reached: true
      }, status: :forbidden
      return
    end

    count = monthly_audio_count(user)
    return if count < FREE_AUDIO_MONTHLY_LIMIT

    render json: {
      error: "無料プランの音声記録は月#{FREE_AUDIO_MONTHLY_LIMIT}回までです。プレミアム会員になると、もっと使えます。",
      limit_reached: true,
      premium_required: true,
      monthly_audio_count: count,
      monthly_audio_limit: FREE_AUDIO_MONTHLY_LIMIT
    }, status: :forbidden
  end

  def monthly_audio_count(user)
    AiUsageLog.this_month_for_user(user, "audio_analysis").count
  end

  def record_audio_usage_log(user)
    AiUsageLog.create!(user: user, feature: "audio_analysis")
  rescue ActiveRecord::ActiveRecordError => e
    # 記録の失敗で、受け付け済みの音声の解析を止めない
    Rails.logger.error "[audio_usage] Failed to create usage log: #{e.class}"
  end
end
