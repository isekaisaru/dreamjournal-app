class SessionsController < ApplicationController
  skip_before_action :authorize_request, only: [:create]

  def create
    begin
      result = AuthService.login(params[:email], params[:password])
      user = result[:user]
      access_token = result[:access_token]
      refresh_token = result[:refresh_token]

      Rails.logger.info "User found: #{user.username}"
      render json: {
        user: user.as_json(only: [:id, :email, :username]),
        jwt: access_token,
        refresh_token: refresh_token
      }, status: :created
    rescue AuthService::InvalidCredentialsError => e
      render json: { error: e.message }, status: :unauthorized
    end
  end

  def destroy
    if current_user
      current_user.update(refresh_token: nil)
      render json: { message: "ログアウトしました" }, status: :ok
    else
      render json: { message: "すでにログアウトしています" }, status: :ok
    end
  end
end
