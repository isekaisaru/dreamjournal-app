class AuthController < ApplicationController
  skip_before_action :authorize_request, only: [:verify]

  def verify
    header = request.headers['Authorization']
    token = header.split(' ').last if header
    if token
      begin
        decoded = decode_token(token)
        puts "Decoded token:", decoded
        user = User.find(decoded['user_id'])
        render json: { user: user.as_json(only: [:id, :email, :username]) }, status: :ok
      rescue JWT::DecodeError
        puts "Failed to decode token"
        render json: { errors: 'Invalid token' }, status: :unauthorized
      rescue JWT::ExpiredSignature
        render json: { errors: 'Token expired' }, status: :unauthorized
      rescue ActiveRecord::RecordNotFound
        render json: { errors: 'User not found' }, status: :not_found
      end
    else
      render json: { errors: 'Token missing' }, status: :unprocessable_entity
    end
  end

  private

  def decode_token(token)
    JWT.decode(token, Rails.application.credentials.secret_key_base, true, { algorithm: 'HS256' })[0]
  end
end