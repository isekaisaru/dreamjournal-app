require_relative '../services/auth_service'

class ApplicationController < ActionController::API
  before_action :authorize_request


  private
  # 現在のユーザーを取得する
  def current_user
    @current_user
  end

  # リクエストを認証する
  def authorize_request
    header = request.headers['Authorization']
    token = header.split(' ').last if header

    Rails.logger.debug "受け取った Authorization ヘッダー: #{header.inspect}"
    Rails.logger.debug "抽出されたトークン: #{token}"
  
    if token
      decoded = AuthService.decode_token(token)

      if decoded && decoded['expired']
        refresh_token # トークンが期限切れの場合はリフレッシュする 
      elsif decoded
       @current_user = User.find_by(id: decoded['user_id'])
       render json: { errors: 'ユーザーが見つかりません' }, status: :unauthorized unless @current_user
      else
       render json: { errors: '無効なトークンです。' }, status: :unauthorized
      end
    else
        render json: { errors: 'トークンが見つかりません' }, status: :unauthorized
    end
  end

  # トークンをリフレッシュする
  def refresh_token
    result = AuthService.refresh_token(current_user)

    if result[:errors]
      render json: { errors: result[:errors] }, status: :unauthorized
    else
      render json: result, status: :ok
    end
  end
end