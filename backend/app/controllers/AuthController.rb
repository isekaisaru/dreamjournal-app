class AuthController < ApplicationController
  before_action :authorize_request, only: [:verify, :me]

  def me
    render json: { user: @current_user.as_json(only: [:id, :email, :username]) }, status: :ok
  end

  def verify
    header = request.headers['Authorization']
    puts "Authorization header:", header.inspect
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
        puts "Token has expired"
        render json: { errors: 'Token expired' }, status: :unauthorized
      rescue ActiveRecord::RecordNotFound
        puts "User not found for ID #{decoded['user_id']}"
        render json: { errors: 'User not found' }, status: :not_found
      end
    else
      puts "Token missing from the request"
      render json: { errors: 'Token missing' }, status: :unprocessable_entity
    end
  end

  private

  def decode_token(token)
    JWT.decode(token, Rails.application.credentials.secret_key_base, true, { algorithm: 'HS256' })[0]
  end
end