class ApplicationController < ActionController::API
  include ActionController::Cookies
  # ActionController::API を継承する場合、CSRF保護はデフォルトで無効になります。
  # これにより、APIへのJSONリクエストがCSRFチェックでブロックされる問題が根本的に解決します。
  # 必要なモジュールは、上記のように個別に include します。

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

    begin
      decoded_token = AuthService.decode_token(token)
      raise StandardError, 'Invalid token' unless decoded_token && decoded_token['user_id']

      user_id = decoded_token['user_id']
      @current_user = User.find_by(id: user_id)

      raise StandardError, "User not found for ID: #{user_id}" unless @current_user

      Rails.logger.info "認証成功: ユーザー ID #{user_id}" if Rails.env.development?
    rescue => e
      Rails.logger.warn "認証失敗: #{e.class} - #{e.message}"
      render json: { error: '認証に失敗しました。再度ログインしてください。' }, status: :unauthorized
    end
  end

  # ユーザー情報のJSON表現（trial判定に必要な項目を含める）
  # 各コントローラ（auth / trial_users 等）で共通利用する
  def user_json(user)
    user.as_json(
      only: [
        :id, :email, :username, :premium, :age_group, :analysis_tone,
        :trial_analysis_count, :trial_audio_count
      ]
    ).merge(
      # カラムが nil の既存ユーザーでも frontend が確実に真偽値で判定できるようにする
      "trial_user" => user.trial_user?
    )
  end

  def set_token_cookies(access_token, refresh_token)
    # 環境に応じてSameSiteとSecure属性を調整
    same_site_policy = Rails.env.production? ? :none : :lax
    secure_flag = Rails.env.production? # 本番環境のみHTTPSを想定

    cookies[:access_token] = {
      value: access_token,
      httponly: true,
      secure: secure_flag,
      same_site: same_site_policy,
      path: '/' # 全てのパスでCookieが利用可能になるよう設定
    }
    cookies[:refresh_token] = {
      value: refresh_token,
      httponly: true,
      secure: secure_flag,
      same_site: same_site_policy,
      path: '/'
    }
  end
end
