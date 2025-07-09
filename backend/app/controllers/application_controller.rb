require_relative '../services/auth_service'

class ApplicationController < ActionController::API
  before_action :authorize_request
  attr_reader :current_user

  private

  # リクエストを認証する
  def authorize_request
    token = cookies[:access_token]

    Rails.logger.info "Cookieからアクセストークンを受け取り、認証処理を実行" if Rails.env.development?

    if token.nil?
      Rails.logger.warn "Cookieにアクセストークンが見つかりません"
      render json: { error: '認証されていません。ログインしてください。' }, status: :unauthorized
      return
    end

    decoded_token = AuthService.decode_token(token)

    # decode_tokenn が nil または想定外の型である場合
    if decoded_token.nil?
      Rails.logger.warn "トークンのデコードに失敗しました (nil)"
      render json: { error: 'トークンの解析に失敗しました。トークンが不正です。'}, status: :unauthorized
      return
    end

    # decoce_token が Hash であることを確認
    unless decoded_token.is_a?(Hash)
      Rails.logger.warn "無効なトークン: #{decoded_token.inspect}"
      render json: { error: '無効なトークンです。トークンの形式が正しくありません。'}, status: :unauthorized
      return
    end

    # トークンの有効期限が切れているか確認

    user_id = decoded_token['user_id']
    @current_user = User.find_by(id: user_id)

    if @current_user.nil?
      Rails.logger.warn "認証されたユーザーが見つかりません。 ID: #{user_id}"
      render json: { error: '認証エラー: 指定されたユーザーIDのユーザーが見つかりません。' }, status: :unauthorized
      return
    end

    Rails.logger.info "認証成功: ユーザー ID #{user_id}" if Rails.env.development?
  end

  def set_token_cookies(access_token, refresh_token)
    cookies[:access_token] = {
      value: access_token,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax
    }
    cookies[:refresh_token] = {
      value: refresh_token,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax,
      path: '/api/v1/auth'
    }
  end
end
