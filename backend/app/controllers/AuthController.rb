class AuthController < ApplicationController
  skip_before_action :authorize_request, only: [:login, :refresh, :logout]

  # ユーザーのログイン
  def login
    begin
      result = AuthService.login(params[:email], params[:password])


      Rails.logger.debug "生成されたトークン: #{result[:access_token]}" if Rails.env.development?
      Rails.logger.debug "生成されたリフレッシュトークン: #{result[:refresh_token]}" if Rails.env.development?

      unless result[:user] && result[:access_token] && result[:refresh_token]
        Rails.logger.error "ログイン処理で必要な情報が不足しています"
        render json: { error: "ログイン処理に失敗しました" }, status: :internal_server_error
        return
      end

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

    Rails.logger.info "受け取ったリフレッシュトークン: #{refresh_token.present? ? '[FILTERED]' : '[なし]'}" if Rails.env.development?
    if refresh_token.nil?
      Rails.logger.warn "リフレッシュトークンがありません"
      render json: { error: "リフレッシュトークンがありません" }, status: :unauthorized
      return
    end

    begin
      result = AuthService.refresh_token(refresh_token)
      Rails.logger.info "新しいアクセストークンを発行: #{result[:access_token]}" if Rails.env.development?
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

    Rails.logger.info "受け取った Authorization ヘッダー: #{token.present? ? '[FILTERED]' : '[なし]'}" if Rails.env.development?
    decoded = AuthService.decode_token(token)

    if decoded.nil?
      Rails.logger.warn "無効なトークン: #{token}"
      render json: { error: "無効なトークンです。トークンの形式が正しくありません。" }, status: :unauthorized
      return
    end

    unless decoded.is_a?(Hash)
      Rails.logger.warn "無効なトークン: #{token}"
      render json: { error: "無効なトークンです。トークンの形式が正しくありません。" }, status: :unauthorized
      return
    end

    if decoded['user_id'].nil?
      Rails.logger.warn "無効なトークン: #{token}"
      render json: { error: "無効なトークンです。トークンにユーザーIDが含まれていません。" }, status: :unauthorized
      return
    end

    user = User.find_by(id: decoded['user_id'])
    if user.nil?
      Rails.logger.warn "無効なユーザーです: #{decoded['user_id']}"
      render json: { error: "指定されたユーザーIDのユーザーが見つかりません。" }, status: :unauthorized
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

    if decoded.nil?
      Rails.logger.warn "トークンのデコードに失敗しました (nil)"
      render json: { error: 'トークンの解析に失敗しました。トークンが不正です。'}, status: :unauthorized
      return
    end

    unless decoded.is_a?(Hash)
      Rails.logger.warn "無効なトークン: #{decoded.inspect}"
      render json: { error: '無効なトークンです。トークンの形式が正しくありません。'}, status: :unauthorized
      return
    end
    if decoded['user_id']
      user = User.find_by(id: decoded['user_id'])
      if user
        render json: { message: 'トークンは有効です。', user: user.as_json(only: [:id, :email, :username]) }, status: :ok
      else
        Rails.logger.warn "トークンは有効だが、該当ユーザーが見つかりません: #{decoded['user_id']}"
        render json: { error: '指定されたユーザーIDのユーザーが見つかりません。'}, status: :unauthorized
      end
    else
      Rails.logger.warn "無効なトークン: #{token}"
      render json: { error: '無効なトークンです。トークンにユーザーIDが含まれていません。'}, status: :unauthorized
    end
  end
end
