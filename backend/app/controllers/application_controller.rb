class ApplicationController < ActionController::API
  before_action :authorize_request

  # トークンをエンコードする
  def encode_token(payload)
    JWT.encode(payload, Rails.application.credentials.secret_key_base)
  end

  # トークンをデコードする
  def decode_token(token)
    JWT.decode(token, Rails.application.credentials.secret_key_base, true, algorithm: 'HS256')[0]
  rescue JWT::DecodeError
    nil
  end

  private

  # リクエストを認証する
  def authorize_request
    header = request.headers['Authorization']
    token = header.split(' ').last if header

    if token
      begin
        decoded = decode_token(token)
        @current_user = User.find_by(id: decoded['user_id'])
      rescue ActiveRecord::RecordNotFound, JWT::DecodeError
        render json: { errors: 'User not found' }, status: :unauthorized
      end
    else
      render json: { errors: 'Missing token' }, status: :unauthorized
    end
  end
end