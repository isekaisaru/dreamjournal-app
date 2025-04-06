require_relative '../services/auth_service'

class ApplicationController < ActionController::API
  before_action :authorize_request
  attr_reader :current_user

  private

  # リクエストを認証する
  def authorize_request
    header = request.headers['Authorization']
    token = header&.split(' ')&.last

    Rails.logger.info "受け取った Authorization ヘッダー: Bearer [FILTERED]"
    Rails.logger.info "トークンを受け取り、認証処理を実行"

    if token.nil?
      Rails.logger.warn "トークンが見つかりません"
      render json: { error: 'トークンが見つかりません' }, status: :unauthorized
      return
    end

    decoded_token = AuthService.decode_token(token)

    # decode_tokenn が nil または想定外の型である場合
    if decoded_token.nil?
      Rails.logger.warn "トークンのデコードに失敗しました (nil)"
      render json: { error: 'トークンの解析に失敗しました'}, status: :unauthorized
      return
    end

    # decoce_token が Hash であることを確認
    unless decoded_token.is_a?(Hash)
      Rails.logger.warn "無効なトークン: #{decoded_token.inspect}"
      render json: { error: '無効なトークンです。'}, status: :unauthorized
      return
    end

    # トークンの有効期限が切れているか確認

    user_id = decoded_token['user_id']
    @current_user = User.find_by(id: user_id)

    if @current_user.nil?
      Rails.logger.warn "認証されたユーザーが見つかりません。 ID: #{user_id} | トークン: #{token}"
      render json: { error: '認証エラー: ユーザーが見つかりません。 ログインし直してください。' }, status: :unauthorized
      return
    end

    Rails.logger.info "認証成功: ユーザー ID #{user_id}"
  end
end
