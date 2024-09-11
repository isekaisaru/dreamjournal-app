class TrialUsersController < ApplicationController
 skip_before_action :authorize_request, only: [:create]

  def create
    Rails.logger.debug "TrialUsersController#create called"
    ActiveRecord::Base.transaction do
      user = User.new(
        name: params[:trial_user][:name],
        email: params[:trial_user][:email],
        password: params[:trial_user][:password],
        password_confirmation: params[:trial_user][:password_confirmation],
        trial_user: true)
      if user.save
        Rails.logger.debug "User saved successfully: #{user.id}"
        render json: { user_id: user.id, token: JsonWebToken.encode(user_id: user.id) }, status: :created
      else
        Rails.logger.debug "User save failed: #{user.errors.full_messages.join(", ")}"
        render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
      end
    end
  rescue => e
    Rails.logger.error "Error in TrialUsersController#create: #{e.message}"
    render json: { error: e.message }, status: :internal_server_error
  end
end