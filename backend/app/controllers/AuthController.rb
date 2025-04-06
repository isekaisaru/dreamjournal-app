class AuthController < ApplicationController
  skip_before_action :authorize_request, only: [:login, :refresh, :logout]

  # ユーザーのログイン
  def login
    begin
      result = AuthService.login(params[:email], params[:password])

      Rails.logger.info "生成されたトークン: #{result[:access_token]}"
      Rails.logger.info "生成されたリフレッシュトークン: #{result[:refresh_token]}"

      render json: {
        access_token: result[:access_token],
        refresh_token: result[:refresh_token],
        user: result[:user].as_json(only: [:id, :email, :username])
      }, status: :ok
    rescue AuthService::InvalidCredentialsError => e
      render json: { error: e.message }, status: :unauthorized
    end
  end

  # 現在のユーザーを返す
  def me
    render json: { user: @current_user.as_json(only: [:id, :email, :username]) }, status: :ok
  end

  # トークンをリフレッシュする
  def refresh
    refresh_token = params[:refresh_token]

    Rails.logger.info "受け取ったリフレッシュトークン: #{refresh_token.present? ? '[FILTERED]' : '[なし]'}"
    if refresh_token.nil?
      Rails.logger.warn "リフレッシュトークンがありません"
      render json: { error: "リフレッシュトークンがありません" }, status: :unauthorized
      return
    end

    begin
      result = AuthService.refresh_token(refresh_token)
      Rails.logger.info "新しいアクセストークンを発行: #{result[:access_token]}"
      render json: { access_token: result[:access_token] }, status: :ok
    rescue AuthService::InvalidRefreshTokenError => e
      Rails.logger.warn "無効なリフレッシュトークン: #{e.message}"
      render json: { error: e.message }, status: :unauthorized
    end
  end

  # ログアウト
  def logout
    header = request.headers['Authorization']
    token = header&.split(' ')&.last

    Rails.logger.info "受け取った Authorization ヘッダー: #{token.present? ? '[FILTERED]' : '[なし]'}"
    decoded = AuthService.decode_token(token)

    if decoded.nil?
      Rails.logger.warn "無効なトークン: #{token}"
      render json: { error: "トークンが無効です" }, status: :unauthorized
      return
    end

    unless decoded.is_a?(Hash)
      Rails.logger.warn "無効なトークン: #{token}"
      render json: { error: "トークンが無効です" }, status: :unauthorized
      return
    end

    if decoded['user_id'].nil?
      Rails.logger.warn "無効なトークン: #{token}"
      render json: { error: "トークンが無効です" }, status: :unauthorized
      return
    end

    user = User.find_by(id: decoded['user_id'])
    if user.nil?
      Rails.logger.warn "無効なユーザーです: #{decoded['user_id']}"
      render json: { error: "無効なユーザーです" }, status: :unauthorized
      return
    end

    user.update(refresh_token: nil)
    render json: { message: "ログアウトしました" }, status: :ok
  end

  # トークンの検証
  def verify
    header = request.headers['Authorization']
    return render json: { error: 'Authorization ヘッダーが必要です。'}, status: :bad_request unless header

    token = header.split(' ').last
    decoded = AuthService.decode_token(token)

    if decoded && decoded['user_id']
      user = User.find_by(id: decoded['user_id'])
      if user
        render json: { message: 'トークンは有効です。', user: user.as_json(only: [:id, :email, :username]) }, status: :ok
      else
        Rails.logger.warn "トークンは有効だが、該当ユーザーが見つかりません: #{decoded['user_id']}"
        render json: { error: '無効なユーザーです。'}, status: :unauthorized
      end
    else
      Rails.logger.warn "無効なトークン: #{token}"
      render json: { error: 'トークンが無効です。'}, status: :unauthorized
    end
  end
end
