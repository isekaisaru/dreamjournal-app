class ApplicationController < ActionController::API

  def encode_token(payload)
    JWT.encode(payload, Rails.application.credentials.secret_key_base)
  end

  def decode_token
    auth_header = request.headers['Authorization']
    if auth_header
      token = auth_header.split(' ')[1]
      begin
        JWT.decode(token,Rails.application.credentials, true, algorithm: 'HS256')[0]
      rescue JWT::DecodeError
        nil
      end
    end
  end

  def authorized_user
    decoded_token = decode_token
    if decoded_token
      user_id = decoded_token['user_id']
      @user = User.find_by(id: user_id)
    end
  end

  def authorize
    render json: { message: 'Please log in' }, status: :unauthorized unless authorized_user
  end
end

