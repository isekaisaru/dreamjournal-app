class AuthController < ApplicationController
  skip_before_action :authorize_request, only: [:login, :refresh, :logout, :verify_email]

  # ユーザーのログイン
  def login
    begin
      result = AuthService.login(
        params[:email], params[:password],
        user_agent: request.user_agent, ip_address: request.remote_ip
      )


      Rails.logger.debug "生成されたトークン: #{result[:access_token]}" if Rails.env.development?
      Rails.logger.debug "生成されたリフレッシュトークン: #{result[:refresh_token]}" if Rails.env.development?

      unless result[:user] && result[:access_token] && result[:refresh_token]
        Rails.logger.error "ログイン処理で必要な情報が不足しています"
        render json: { error: "ログイン処理に失敗しました" }, status: :internal_server_error
        return
      end

      set_token_cookies(result[:access_token], result[:refresh_token])
      render json: { user: user_json(result[:user]) }, status: :ok
    rescue AuthService::InvalidCredentialsError => e
      render json: { error: e.message }, status: :unauthorized
    rescue StandardError => e # その他の予期せぬエラー
      Rails.logger.error "ログイン処理中に予期せぬエラーが発生: #{e.message}\n#{e.backtrace.join("\n")}"
      render json: { error: 'ログイン処理中にエラーが発生しました' }, status: :internal_server_error
    end
  end

  # 現在のユーザーを返す
  def me
    render json: { user: user_json(@current_user) }, status: :ok
  end

  # プロフィール更新 PATCH /auth/me
  def update_me
    if @current_user.update(profile_params)
      render json: { user: user_json(@current_user) }, status: :ok
    else
      render json: { error: @current_user.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  # トライアル→本登録 昇格 PATCH /auth/convert_trial
  # 同じ User レコードを更新するため、夢・プロフィールはそのまま引き継がれる。
  # セキュリティ: 昇格時にトークンをローテーションし、旧トライアルの
  # refresh_token を無効化するため、新しい access/refresh を Cookie に再設定する。
  def convert_trial
    unless @current_user.trial_user?
      return render json: { error: "すでに 本登録 ずみだよ。" }, status: :unprocessable_entity
    end

    result = AuthService.convert_trial(
      @current_user, convert_trial_params,
      user_agent: request.user_agent, ip_address: request.remote_ip
    )
    set_token_cookies(result[:access_token], result[:refresh_token])
    # 昇格で設定された実メールアドレスは未確認状態のため、確認メールを送る
    send_verification_email(result[:user])
    render json: { user: user_json(result[:user]) }, status: :ok
  rescue AuthService::RegistrationError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # メールアドレス確認 POST /auth/verify_email（未ログインでも実行可能）
  # メール内リンクのトークンを照合して email_verified_at を打つ
  def verify_email
    user = User.find_by_email_verification_token(params[:token])

    if user.nil? || !user.email_verification_token_valid?
      return render json: { error: "リンクが無効か、期限切れです。もう一度確認メールを送ってください。" },
                    status: :unprocessable_content
    end

    user.verify_email!
    render json: { message: "メールアドレスを確認しました", email_verified: true }, status: :ok
  end

  # 確認メール再送 POST /auth/resend_verification（要ログイン）
  def resend_verification
    if @current_user.email_verified?
      return render json: { message: "すでに確認済みです", email_verified: true }, status: :ok
    end

    unless @current_user.can_resend_verification_email?
      return render json: { error: "確認メールを送信済みです。少し待ってからもう一度お試しください。" },
                    status: :too_many_requests
    end

    send_verification_email(@current_user)
    render json: { message: "確認メールを送りました" }, status: :ok
  end

  # トークンをリフレッシュする
  def refresh
    refresh_token = cookies[:refresh_token]

    Rails.logger.info "受け取ったリフレッシュトークン: #{refresh_token.present? ? '[FILTERED]' : '[なし]'}" if Rails.env.development?
    if refresh_token.nil?
      Rails.logger.warn "リフレッシュトークンがリクエストに含まれていません"
      render json: { error: "リフレッシュトークンがありません" }, status: :unauthorized
      return
    end

    begin
      result = AuthService.refresh_token(
        refresh_token,
        user_agent: request.user_agent, ip_address: request.remote_ip
      )
      Rails.logger.info "新しいアクセストークンを発行: #{result[:access_token]}" if Rails.env.development?
      set_token_cookies(result[:access_token], result[:refresh_token]) 
      render json: { message: "トークンを更新しました" }, status: :ok
    rescue AuthService::InvalidRefreshTokenError => e
      Rails.logger.warn "無効なリフレッシュトークン: #{e.message}"
      render json: { error: e.message }, status: :unauthorized
    rescue StandardError => e # その他の予期せぬエラー
      Rails.logger.error "トークンリフレッシュ中に予期せぬエラーが発生: #{e.message}\n#{e.backtrace.join("\n")}"
      render json: { error: 'トークンリフレッシュ中にエラーが発生しました' }, status: :internal_server_error
    end
  end

  # ログアウト
  # リフレッシュトークンを受け取り、それを無効化する方式に変更
  def logout
    refresh_token = cookies[:refresh_token]

    unless refresh_token
      Rails.logger.warn "ログアウトリクエストにリフレッシュトークンが含まれていません"
      render json: { error: "ログアウトにはリフレッシュトークンが必要です" }, status: :bad_request # 400 Bad Request
      return
    end

    begin
      # 該当セッションのみを失効させる（他端末のログインは維持される）
      AuthService.revoke_session(refresh_token)
      cookies.delete(:access_token)
      cookies.delete(:refresh_token, path: '/')
      render json: { message: "ログアウトしました" }, status: :ok
    rescue AuthService::InvalidRefreshTokenError => e
      # 無効なリフレッシュトークンが指定された場合 (既にログアウト済み、または不正なトークン)
      render json: { error: "無効なリフレッシュトークンです。ログアウトできませんでした。" }, status: :unauthorized
    rescue ActiveRecord::RecordInvalid => e # update_column では通常発生しないが、万が一のため
      Rails.logger.error "ログアウト処理中のDB更新に失敗: #{e.message}"
      render json: { error: 'ログアウト処理中にデータベースエラーが発生しました' }, status: :internal_server_error
    rescue StandardError => e # その他の予期せぬエラー
      Rails.logger.error "ログアウト処理中に予期せぬエラーが発生: #{e.message}\n#{e.backtrace.join("\n")}"
      render json: { error: 'ログアウト処理中にエラーが発生しました' }, status: :internal_server_error
    end
  end

  # トークンの検証
  def verify
    render json: { authenticated: true, user: user_json(@current_user) }, status: :ok
  end

  private

  # user_json は ApplicationController で共通定義（trial判定項目を含む）

  def profile_params
    params.require(:user).permit(:username, :age_group, :analysis_tone)
  end

  def convert_trial_params
    params.require(:user).permit(:email, :username, :password, :password_confirmation)
  end
end
