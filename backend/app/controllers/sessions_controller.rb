class SessionsController < ApplicationController
  skip_before_action :authorize_request, only: [:create]

  def create
    begin
      result = AuthService.login(params[:email], params[:password])

      unless result[:user] && result[:access_token] && result[:refresh_token]
        Rails.logger.error "ログイン処理で必要な情報が不足しています"
        render json: { error: "ログイン処理に失敗しました" }, status: :internal_server_error
        return
      end
      user = result[:user]
      access_token = result[:access_token]
      refresh_token = result[:refresh_token]

      Rails.logger.info "User found: #{user.username}" if Rails.env.development?
      render json: {
        user: user.as_json(only: [:id, :email, :username]),
        access_token: access_token,
        refresh_token: refresh_token
      }, status: :ok
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
