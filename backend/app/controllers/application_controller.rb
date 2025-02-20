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

    Rails.logger.info "受け取った Authorization ヘッダー: Bearer [FILTERED]"
    Rails.logger.info "トークンを受け取り、認証処理を実行"
  
    if token.nil?
      render json: { errors: 'トークンが見つかりません' }, status: :unauthorized
      return
    end

    decoded = AuthService.decode_token(token)

    if decoded.nil?
      Rails.logger.warn "無効なトークンを受け取りました。"
      render json: { errors: '無効なトークンです。'}, status: :unauthorized
      return
    end

    if decoded['expired']
      render json: { errors: 'トークンの有効期限が切れています。再ログインしてください'}, status: :unauthorized
      return
    end

    @current_user = User.find_by(id: decoded['user_id'])

    if @current_user.nil?
      Rails.logger.warn " User not found for ID: #{decoded['user_id']}"
      render json: { errors: 'ユーザーが見つかりません' }, status: :unauthorized
    end
  end

  
end