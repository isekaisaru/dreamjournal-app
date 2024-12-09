class ApplicationController < ActionController::API
  before_action :authorize_request

  # トークンをエンコードする
  def encode_token(payload)
    payload[:exp] = 24.hours.from_now.to_i #
    JWT.encode(payload, Rails.application.credentials.secret_key_base)
  end

  # トークンをデコードする
  def decode_token(token)
    JWT.decode(token, Rails.application.credentials.secret_key_base, true, algorithm: 'HS256')[0]
  rescue JWT::ExpiredSignature => e
    Rails.logger.warn "トークンが期限切れです: #{e.message}"
    { 'expired' => true } # トークンが期限切れの場合
  rescue JWT::DecodeError => e
    Rails.logger.error "トークンデコードエラー: #{e.message}"
    nil
  end

  # トークンをリフレッシュする
  def refresh_token
    if @current_user
      payload = { user_id: @current_user.id }
      new_token = encode_token(payload)
      render json: { token: new_token, message: 'トークンが更新されました。'}, status: :ok
    else
      render json: { errors: 'ユーザーが認証されていません。'}, status: :unauthorized
    end
  end

  private
  # 現在のユーザーを取得する
  def current_user
    @current_user
  end
  # リクエストを認証する
  def authorize_request
    header = request.headers['Authorization']
    Rails.logger.debug "受け取った Authorization ヘッダー: #{header.inspect}"

    if header
      token = header.split(' ').last
      Rails.logger.debug "抽出されたトークン: #{token}"
      if token
        begin
          decoded = decode_token(token)
          Rails.logger.debug "デコードされたトークン: #{decoded.inspect}"

          if decoded && decoded['expired']
            refresh_token # トークンが期限切れの場合はリフレッシュする 
          elsif decoded
            @current_user = User.find_by(id: decoded['user_id'])
            unless @current_user
              Rails.logger.error "ユーザーが見つかりません: #{decoded['user_id']}"
              render json: { errors: 'ユーザーが見つかりません' }, status: :unauthorized
            end
          else
            Rails.logger.error "無効なトークン: #{token}"
            render json: { errors: '無効なトークンです。' }, status: :unauthorized
          end
        rescue ActiveRecord::RecordNotFound
          render json: { errors: 'ユーザーが見つかりません' }, status: :unauthorized
        end
      else
        Rails.logger.error "トークンが空です。"
        render json: { errors: 'トークンが見つかりません' }, status: :unauthorized
      end
    else
      render json: { errors: 'トークンが見つかりません' }, status: :unauthorized
    end
  end
end