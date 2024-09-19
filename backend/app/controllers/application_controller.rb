class ApplicationController < ActionController::API
  before_action :authorize_request

  # トークンをエンコードする
  def encode_token(payload)
    payload[:exp] = 24.hours.from_now.to_i
    JWT.encode(payload, Rails.application.credentials.secret_key_base)
  end

  # トークンをデコードする
  def decode_token(token)
    JWT.decode(token, Rails.application.credentials.secret_key_base, true, algorithm: 'HS256')[0]
  rescue JWT::DecodeError
    nil
  rescue JWT::ExpiredSignature
    render json: { errors: 'Token expired' }, status: :unauthorized
  end

  private

  # リクエストを認証する
  def authorize_request
    header = request.headers['Authorization']
    if header
      token = header.split(' ').last
      if token
        begin
          decoded = decode_token(token)
          if decoded
            @current_user = User.find_by(id: decoded['user_id'])
            render json: { errors: 'ユーザーが見つかりません' }, status: :unauthorized unless @current_user
          else
            render json: { errors: '無効なトークンです。' }, status: :unauthorized
          end
        rescue ActiveRecord::RecordNotFound
          render json: { errors: 'ユーザーが見つかりません' }, status: :unauthorized
        end
      else
        render json: { errors: 'トークンが見つかりません' }, status: :unauthorized
      end
    else
      render json: { errors: 'トークンが見つかりません' }, status: :unauthorized
    end
  end
end