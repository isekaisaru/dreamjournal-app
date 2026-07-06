require 'jwt'

class AuthService
  class InvalidCredentialsError < StandardError; end
  class InvalidRefreshTokenError < StandardError; end
  class RegistrationError < StandardError; end

  # JWTシークレットキー
  # - 本番: 必須（未設定なら起動時に例外）
  # - 開発/テスト: フォールバックを用意してE2Eやローカル実行を安定化
  SECRET_KEY = ENV['JWT_SECRET_KEY'].presence || (
    (Rails.env.development? || Rails.env.test?) ? 'dev-test-secret-change-me' : nil
  )
  if SECRET_KEY.blank? && Rails.env.production?
    raise 'JWT_SECRET_KEY environment variable is not set for production.'
  end

  # ログイン処理
  # 多端末対応: 既存セッションは失効させず、新しいセッションを追加する
  def self.login(email, password, user_agent: nil, ip_address: nil)
    user = User.find_by(email: email.downcase)
    if user&.authenticate(password)
      access_token = encode_token(user.id)
      refresh_token = create_session(user, user_agent: user_agent, ip_address: ip_address)
      # 🛡️ セキュア化：トークン本文は出力せず、成功の事実のみをログに残す
      Rails.logger.info "認証成功: ユーザーID=#{user.id} トークン生成完了"
      { access_token: access_token, refresh_token: refresh_token, user: user }
    else
      Rails.logger.warn "認証失敗: email=#{email}"
      raise InvalidCredentialsError, 'メールアドレスまたはパスワードが正しくありません'
    end
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error "ログイン成功後、セッション作成に失敗: #{e.message}"
    raise InvalidCredentialsError, "ログイン処理中にエラーが発生しました。"
  end

  # ユーザーを登録する
  def self.register(params, user_agent: nil, ip_address: nil)
    user = User.new(
      email: params[:email]&.downcase,
      username: params[:username],
      password: params[:password],
      password_confirmation: params[:password_confirmation]
    )
    if user.save
      access_token = encode_token(user.id)
      refresh_token = create_session(user, user_agent: user_agent, ip_address: ip_address)
      Rails.logger.info "新規登録ユーザーID: #{user.id} のセッションを作成しました。" if Rails.env.development?
      { access_token: access_token, refresh_token: refresh_token, user: user }
    else
      raise RegistrationError, user.errors.full_messages.join(", ")
    end
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error "ユーザー作成成功後、セッション作成に失敗: #{e.message}"
    raise RegistrationError, "ユーザー登録中にエラーが発生しました。"
  end

  # トライアルユーザーを作成する
  def self.create_trial_user(params, user_agent: nil, ip_address: nil)
    user = User.new(
      email: params[:email]&.downcase,
      username: params[:username],
      password: params[:password],
      password_confirmation: params[:password_confirmation],
      trial_user: true
    )
    if user.save
      access_token = encode_token(user.id)
      refresh_token = create_session(user, user_agent: user_agent, ip_address: ip_address)
      Rails.logger.info "トライアルユーザーID: #{user.id} のセッションを作成しました。" if Rails.env.development?
      { access_token: access_token, refresh_token: refresh_token, user: user }
    else
      raise RegistrationError, user.errors.full_messages.join(", ")
    end
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error "トライアルユーザー作成成功後、セッション作成に失敗: #{e.message}"
    raise RegistrationError, "トライアルユーザー登録中にエラーが発生しました。"
  end

  # トライアルユーザーを本登録ユーザーへ昇格する
  # 同じ User レコードの認証情報を更新し trial_user を外すだけなので、
  # 夢・プロフィール（user_id 紐づき）はそのまま引き継がれる。
  # セキュリティ: 昇格（権限変化）時は全セッションを失効させてから
  # 新しいセッションを発行し、旧トライアル時に漏れていた可能性のある
  # トークンをすべて無効化する。
  def self.convert_trial(user, params, user_agent: nil, ip_address: nil)
    raise RegistrationError, "すでに本登録済みのアカウントです。" unless user.trial_user?

    user.email = params[:email]&.downcase
    user.username = params[:username]
    user.password = params[:password]
    user.password_confirmation = params[:password_confirmation]
    user.trial_user = false

    if user.save
      revoke_all_sessions(user)
      access_token = encode_token(user.id)
      refresh_token = create_session(user, user_agent: user_agent, ip_address: ip_address)
      Rails.logger.info "ユーザーID: #{user.id} をトライアルから本登録へ昇格しました。" if Rails.env.development?
      { access_token: access_token, refresh_token: refresh_token, user: user }
    else
      raise RegistrationError, user.errors.full_messages.join(", ")
    end
  end

  # JWTトークンを生成する
  def self.encode_token(user_id)
    raise ArgumentError, "User ID is missing" if user_id.nil?

    payload = { user_id: user_id, exp: jwt_expiration_time }
    JWT.encode(payload, SECRET_KEY, 'HS256')
  end

  # トークンをデコードする
  def self.decode_token(token)
    return nil if token.nil?

    begin
      Rails.logger.info "トークンをデコードします。" if Rails.env.development?

      decoded_array = JWT.decode(token, SECRET_KEY, true, { algorithm: 'HS256' })
      decoded = decoded_array[0]

      Rails.logger.info "デコード後のトークン情報: #{decoded.inspect}" if Rails.env.development?

      unless decoded.is_a?(Hash) && decoded['user_id'].present?
        Rails.logger.warn "JWT のデコード結果が無効です: #{decoded.inspect}"
        return nil
      end

      decoded
    rescue JWT::ExpiredSignature
      Rails.logger.warn "JWT トークンが期限切れです (token_prefix=#{token.to_s[0..7]}...)"
      return nil
    rescue JWT::DecodeError => e
      Rails.logger.warn "JWT トークンのデコードに失敗しました。Error: #{e.message} (token_prefix=#{token.to_s[0..7]}...)"
      return nil
    end
  end

  # refresh token を検証し、access/refresh 両トークンをローテーションする
  def self.refresh_token(refresh_token, user_agent: nil, ip_address: nil)
    Rails.logger.info "リフレッシュトークンを検証します。" if Rails.env.development?
    raise InvalidRefreshTokenError, 'リフレッシュトークンがありません' if refresh_token.blank?

    session = UserSession.find_active_by_token(refresh_token)

    if session
      new_refresh_token = generate_refresh_token
      session.rotate!(new_refresh_token, lifetime: refresh_token_lifetime)
      { access_token: encode_token(session.user_id), refresh_token: new_refresh_token }
    else
      # レガシー互換: 旧 users.refresh_token（平文カラム）と照合し、
      # 一致したらその場で user_sessions へ透過的に移行する。
      # デプロイ前からログイン中のユーザーを強制ログアウトさせないための一時パス。
      user = find_user_by_legacy_refresh_token(refresh_token)
      user.update_column(:refresh_token, nil)
      new_refresh_token = create_session(user, user_agent: user_agent, ip_address: ip_address)
      Rails.logger.info "ユーザーID: #{user.id} のレガシートークンをセッションへ移行しました。"
      { access_token: encode_token(user.id), refresh_token: new_refresh_token }
    end
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.error "リフレッシュトークン検証成功後、DB更新に失敗: #{e.message}"
    raise InvalidRefreshTokenError, "トークンリフレッシュ処理中にエラーが発生しました。"
  end

  # ログアウト: 該当セッションのみ失効させる（他端末のセッションは維持）
  def self.revoke_session(refresh_token)
    raise InvalidRefreshTokenError, 'リフレッシュトークンがありません' if refresh_token.blank?

    session = UserSession.find_active_by_token(refresh_token)
    if session
      session.revoke!
      return true
    end

    # レガシー互換: 旧カラムのトークンでのログアウト
    user = find_user_by_legacy_refresh_token(refresh_token)
    user.update_column(:refresh_token, nil)
    true
  end

  # 全セッション失効（trial昇格・パスワード変更などの権限変化時に使う）
  def self.revoke_all_sessions(user)
    user.user_sessions.active.update_all(revoked_at: Time.current)
    user.update_column(:refresh_token, nil) if user.refresh_token.present?
  end

  # 新しいセッションを作成し、生の refresh token を返す（DBには digest のみ保存）
  def self.create_session(user, user_agent: nil, ip_address: nil)
    token = generate_refresh_token
    user.user_sessions.create!(
      refresh_token_digest: UserSession.digest(token),
      expires_at: refresh_token_lifetime.from_now,
      user_agent: user_agent&.slice(0, 255),
      ip_address: ip_address,
      last_used_at: Time.current
    )
    UserSession.prune_for(user)
    token
  end

  # リフレッシュトークンを生成
  def self.generate_refresh_token
    SecureRandom.urlsafe_base64(64)
  end

  # 旧 users.refresh_token カラムからユーザーを検索（レガシー互換パス）
  # burn-in 後にカラムごと削除予定（docs/auth-hardening-spec.md）
  def self.find_user_by_legacy_refresh_token(refresh_token)
    user = User.find_by(refresh_token: refresh_token)
    if user.nil?
      Rails.logger.warn "リフレッシュトークンが無効です (token_prefix=#{refresh_token.to_s[0..7]}...)"
      raise InvalidRefreshTokenError, '無効なリフレッシュトークン'
    end
    user
  end

  # refresh token の有効期間（ローテーション時にスライド延長）
  def self.refresh_token_lifetime
    ENV.fetch('REFRESH_TOKEN_EXPIRATION_DAYS', '30').to_i.days
  end

  # JWTの有効期限を環境変数で設定する
  def self.jwt_expiration_time
    expiration_minutes = ENV.fetch('JWT_EXPIRATION_MINUTES', '15').to_i
    expiration_minutes.minutes.from_now.to_i
  end
end
