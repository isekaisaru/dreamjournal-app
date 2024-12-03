class AuthController < ApplicationController
  skip_before_action :authorize_request, only: [:login, :refresh]

  # ユーザーのログイン
  def login
    user = User.find_by(email: params[:email])
    if user&.authenticate(params[:password])
      token = encode_token({ user_id: user.id })
      render json: { token: token, user: user.as_json(only: [:id, :email, :username]) }, status: :ok
    else
      render json: { errors: '無効なメールアドレスまたはパスワードです。'}, status: :unauthorized
    end
  end

  # 現在のユーザーを返す
  def me
    render json: { user: @current_user.as_json(only: [:id, :email, :username]) }, status: :ok
  end

  # トークンをリフレッシュする
  def refresh
    header = request.headers['Authorizaton']
    token = header.split(' ').last if header

    if token
      decoded = decode_token(token)

      if decoded && decoded['expired']
        user = User.find_by(id: decoded['user_id'])
        if user
          new_token = encode_token(user_id: user.id)
          render json: { token: new_token }, status: :ok
        else
          render json: { errors: 'ユーザーが見つかりません。' }, status: not_found
        end
      else
        render json: { errors: 'トークンが有効です。'}, status: :bad_request
      end
    else
      render json: { errors: 'トークンが見つかりません。'},status: :unprocessable_entity
    end
  end

  # トークンの検証
  def verify
    header = request.headers['Authorization']
    token = header.split(' ').last if header

    if token
      decoded = decode_token(token)
      if decoded
        user = User.find_by(id: decoded['user_id'])
        if user
          render json: { message: 'トークンは有効です。', user: user.as_json(only: [:id, :email, :username]) }, status: :ok
        else
          render json: { errors: '無効なユーザーです。'}, status: :unauthorized
        end
      else
        render json: { errors: 'トークンが無効です。'}, status: :unauthorized
      end
    else
      render json: { errors: 'トークンが見つかりません。'}, status: :bad_request
    end
  end
end