class TrialUsersController < ApplicationController
  skip_before_action :authorize_request, only: [:create]

  def create
    Rails.logger.debug "TrialUsersController#create called"
    begin
      result = AuthService.create_trial_user(params[:trial_user])
      render json: { user_id: result[:user_id], token: result[:token] }, status: :created
    rescue AuthService::RegistrationError => e
      Rails.logger.error "Error in TrialUsersController#create: #{e.message}"
      render json: { error: e.message }, status: :internal_server_error
    end
  end
end
