class TrialUsersController < ApplicationController
  skip_before_action :authorize_request, only: [:create]

  def create
    Rails.logger.debug "TrialUsersController#create called" if Rails.env.development?
    result = nil
    error_response = nil

    ApplicationRecord.transaction do
      begin
        result = AuthService.create_trial_user(params[:trial_user])

        unless result[:user] && result[:access_token] && result[:refresh_token]
          Rails.logger.error "トライアルユーザー作成処理で必要な情報が不足しています: #{result.inspect}"
          error_response = { body: { error: "トライアルユーザー作成処理に失敗しました" }, status: :internal_server_error }
          raise ActiveRecord::Rollback
        end

        result[:user].dream_profiles.create!(
          name: "自分", avatar_emoji: "😴", color: "#6366f1",
          relationship: "self", active: true, position: 0
        )
      rescue AuthService::RegistrationError => e
        Rails.logger.error "Error in TrialUsersController#create: #{e.message}"
        error_response = { body: { error: e.message }, status: :internal_server_error }
        raise ActiveRecord::Rollback
      rescue ActiveRecord::RecordInvalid => e
        Rails.logger.error "自分プロフィールの自動作成に失敗しました: #{e.message}"
        error_response = { body: { error: "トライアルユーザー作成処理に失敗しました" }, status: :internal_server_error }
        raise ActiveRecord::Rollback
      end
    end

    if error_response
      render json: error_response[:body], status: error_response[:status]
    else
      set_token_cookies(result[:access_token], result[:refresh_token])
      render json: { user: user_json(result[:user]) }, status: :created
    end
  end
end
