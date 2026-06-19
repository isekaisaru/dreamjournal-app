# frozen_string_literal: true

class DreamProfilesController < ApplicationController
  before_action :set_profile, only: [:update, :archive, :restore]

  TRIAL_PROFILE_LIMIT = 1  # トライアルユーザーのプロフィール作成上限

  # GET /dream_profiles
  def index
    profiles = current_user.dream_profiles.order(:position, :created_at)
    # プロフィールごとの夢の数を1クエリでまとめて取得（N+1を避ける）
    counts = current_user.dreams.group(:dream_profile_id).count
    render json: profiles.map { |p| profile_json(p, counts.fetch(p.id, 0)) }
  end

  # POST /dream_profiles
  def create
    profile = nil
    result = :ok

    current_user.with_lock do
      # トライアル制限をロック内で確認（ロック外だと同時リクエストで2件作られる恐れがある）
      if current_user.trial_user? && !current_user.premium? &&
         current_user.dream_profiles.count >= TRIAL_PROFILE_LIMIT
        result = :trial_limit_exceeded
        raise ActiveRecord::Rollback
      end

      active_count = current_user.dream_profiles.where(active: true).count
      if active_count >= DreamProfile::MAX_ACTIVE_COUNT
        result = :limit_exceeded
        raise ActiveRecord::Rollback
      end

      profile = current_user.dream_profiles.build(profile_params)
      unless profile.save
        result = :invalid
        raise ActiveRecord::Rollback
      end
    end

    case result
    when :ok
      render json: profile_json(profile), status: :created
    when :trial_limit_exceeded
      render json: {
        error: "お試しでは プロフィールは #{TRIAL_PROFILE_LIMIT}つ までだよ。アカウント登録すると、もっと つくれるよ。",
        limit_reached: true,
        trial_profile_limit: TRIAL_PROFILE_LIMIT
      }, status: :forbidden
    when :limit_exceeded
      render json: { error: "アクティブなプロフィールは#{DreamProfile::MAX_ACTIVE_COUNT}件までです" },
             status: :unprocessable_entity
    when :invalid
      render json: { errors: profile.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PATCH /dream_profiles/:id
  def update
    if @profile.update(profile_params)
      render json: profile_json(@profile)
    else
      render json: { errors: @profile.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PATCH /dream_profiles/:id/archive
  def archive
    if @profile.update(active: false)
      render json: profile_json(@profile)
    else
      render json: { errors: @profile.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PATCH /dream_profiles/:id/restore
  def restore
    result = :ok

    current_user.with_lock do
      active_count = current_user.dream_profiles.where(active: true).count
      if active_count >= DreamProfile::MAX_ACTIVE_COUNT
        result = :limit_exceeded
        raise ActiveRecord::Rollback
      end

      unless @profile.update(active: true)
        result = :invalid
        raise ActiveRecord::Rollback
      end
    end

    case result
    when :ok
      render json: profile_json(@profile)
    when :limit_exceeded
      render json: { error: "アクティブなプロフィールは#{DreamProfile::MAX_ACTIVE_COUNT}件までです" },
             status: :unprocessable_entity
    when :invalid
      render json: { errors: @profile.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_profile
    @profile = current_user.dream_profiles.find_by(id: params[:id])
    render json: { error: "プロフィールが見つかりません" }, status: :not_found unless @profile
  end

  def profile_params
    params.permit(:name, :avatar_emoji, :color, :relationship, :position)
  end

  def profile_json(profile, dreams_count = nil)
    # 一覧（index）からは集計済みの件数が渡る。create/update/archive/restore からは
    # 引数なしで呼ばれるため、その場合だけ単発クエリでフォールバックする。
    dreams_count ||= profile.dreams.count
    profile.as_json(
      only: %i[id name avatar_emoji color relationship active position created_at updated_at]
    ).merge("archived" => !profile.active, "dreams_count" => dreams_count)
  end
end
