class ApplicationController < ActionController::API
  include ActionController::Cookies
  # ActionController::API を継承する場合、CSRF保護はデフォルトで無効になります。
  # これにより、APIへのJSONリクエストがCSRFチェックでブロックされる問題が根本的に解決します。
  # 必要なモジュールは、上記のように個別に include します。
  #
  # その代わりとして、状態変更系リクエストのOrigin（送信元）を検証するCSRF対策を行う。
  # 認証チェックより先に効かせるため、before_actionの宣言順を authorize_request より前にする。
  # Stripe Webhook（サーバー間通信でOriginヘッダーを持たない）は
  # WebhooksController 側で skip_before_action している。
  before_action :verify_request_origin!
  before_action :authorize_request
  attr_reader :current_user

  private

  # GET/HEAD以外（状態変更系）のリクエストについて、Origin（無ければReferer）が
  # 許可オリジン一覧（AllowedOrigins、cors.rbと共有）に含まれているかを確認する。
  # Rails APIモードはCSRF保護がデフォルト無効なため、これがCSRF対策の実体となる。
  def verify_request_origin!
    return if request.get? || request.head? || request.options?

    source = request.headers['Origin'].presence || origin_from_referer

    return if source.present? && AllowedOrigins.list.include?(source)

    Rails.logger.warn(
      "[CSRF] 許可されていないOriginからの#{request.method}リクエストを拒否 " \
      "path=#{request.path} origin=#{source.inspect}"
    )
    render json: { error: '不正なリクエスト元からの操作は許可されていません。' }, status: :forbidden
  end

  def origin_from_referer
    referer = request.headers['Referer']
    return nil if referer.blank?

    uri = URI.parse(referer)
    return nil unless uri.scheme && uri.host

    port_suffix = uri.port && uri.port != uri.default_port ? ":#{uri.port}" : ''
    "#{uri.scheme}://#{uri.host}#{port_suffix}"
  rescue URI::InvalidURIError
    nil
  end

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
      "trial_user" => user.trial_user?,
      "email_verified" => user.email_verified?
    )
  end

  # メールアドレス確認を必須にする before_action（checkout / AI課金系で共通利用）。
  # - トライアルユーザーは対象外（実メール検証フローの外。本登録昇格時に検証する）
  # - 既存ユーザーはmigrationで検証済みにバックフィル済みのため影響なし
  # 各コントローラで `before_action :require_verified_email, only: [...]` として使う。
  # AI課金系では check_analysis_limit 等の枠消費チェックより**前**に置くこと
  # （403で拒否したのに月次カウントだけ減る事故を防ぐ）。
  def require_verified_email
    return if current_user.trial_user?
    return if current_user.email_verified?

    render json: {
      error: "メールアドレスの確認が必要です。確認メールのリンクを開いてください。",
      email_verification_required: true
    }, status: :forbidden
  end

  # メール確認メールを送信する（登録・トライアル昇格・再送で共通利用）。
  # メール配信基盤の不調で登録自体を失敗させないよう best-effort とし、
  # 失敗はログに残すだけにする。
  def send_verification_email(user)
    token = user.generate_email_verification_token!
    UserMailer.email_verification(user, token).deliver_later
  rescue StandardError => e
    Rails.logger.error "確認メール送信に失敗: user_id=#{user.id} #{e.class} - #{e.message}"
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
