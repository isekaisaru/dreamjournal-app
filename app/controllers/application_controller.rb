class ApplicationController < ActionController::API

  # トークンをエンコードする
  def encode_token(payload)
    JWT.encode(payload, Rails.application.credentials.secret_key_base)
  end

  # トークンをデコードする
  def decode_token
    auth_header = request.headers['Authorization']
    if auth_header
      token = auth_header.split(' ')[1]
      begin
        JWT.decode(token, Rails.application.credentials.secret_key_base, true, algorithm: 'HS256')[0]
      rescue JWT::DecodeError
        nil
      end
    end
  end

  # 認証されたユーザーを取得する
  def authorized_user
    decoded_token = decode_token
    if decoded_token
      user_id = decoded_token['user_id']
      @user = User.find_by(id: user_id)
    end
  end

  # 認証を確認する
  def authorize
    render json: { message: 'Please log in' }, status: :unauthorized unless authorized_user
  end

  private

  # リクエストを認証する
  def authorize_request
    header = request.headers['Authorization']
    token = header.split(' ').last if header
    begin
      @decoded = JsonWebToken.decode(token)
      @current_user = User.find(@decoded[:user_id])
    rescue ActiveRecord::RecordNotFound => e
      render json: { errors: e.message }, status: :unauthorized
    rescue JWT::DecodeError => e
      render json: { errors: e.message }, status: :unauthorized
    end
  end
end

