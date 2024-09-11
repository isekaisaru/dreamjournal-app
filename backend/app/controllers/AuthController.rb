class AuthController < ApplicationController
  skip_before_action :authorize_request, only: [:verify]

  def verify
    header = request.headers['Authorization']
    token = header.split(' ').last if header
    if token
      begin
        decoded = decode_token(token)
        user = User.find(decoded['user_id'])
        render json: { user: user.as_json(only: [:id, :email, :username]) }, status: :ok
      rescue JWT::DecodeError
        render json: { errors: 'Invalid token' }, status: :unauthorized
      rescue ActiveRecord::RecordNotFound
        render json: { errors: 'User not found' }, status: :not_found
      end
    else
      render json: { errors: 'Token missing' }, status: :unprocessable_entity
    end
  end

  private

  def decode_token(token)
    JWT.decode(token, Rails.application.secrets.secret_key_base)[0]
  end
end