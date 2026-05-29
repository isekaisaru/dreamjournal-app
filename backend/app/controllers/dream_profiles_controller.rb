# frozen_string_literal: true

class DreamProfilesController < ApplicationController
  before_action :set_profile, only: [:update, :archive, :restore]

  # GET /dream_profiles
  def index
    profiles = current_user.dream_profiles.order(:position, :created_at)
    render json: profiles.map { |p| profile_json(p) }
  end

  # POST /dream_profiles
  def create
    profile = nil
    result = :ok

    current_user.with_lock do
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

  def profile_json(profile)
    profile.as_json(
      only: %i[id name avatar_emoji color relationship active position created_at updated_at]
    ).merge("archived" => !profile.active)
  end
end
