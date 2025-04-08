class TrialUsersController < ApplicationController
  skip_before_action :authorize_request, only: [:create]

  def create
    Rails.logger.debug "TrialUsersController#create called" if Rails.env.development?
    begin
      result = AuthService.create_trial_user(params[:trial_user])

      unless result[:user_id] && result[:token]
        Rails.logger.error "トライアルユーザー作成処理で必要な情報が不足しています"
        render json: { error: "トライアルユーザー作成処理に失敗しました" }, status: :internal_server_error
        return
      end
      render json: { user_id: result[:user_id], token: result[:token] }, status: :created
    rescue AuthService::RegistrationError => e
      Rails.logger.error "Error in TrialUsersController#create: #{e.message}"
      render json: { error: e.message }, status: :internal_server_error
    end
  end
end
