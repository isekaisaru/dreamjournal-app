require 'jwt'

class AuthService
  class InvalidCredentialsError < StandardError; end
  class InvalidRefreshTokenError < StandardError; end
  class RegistrationError < StandardError; end

  SECRET_KEY = ENV['JWT_SECRET_KEY']
  if SECRET_KEY.blank? && Rails.env.production?
    raise 'JWT_SECRET_KEY environment variable is not set for production.'
  end

  # ログイン処理
  def self.login(email, password)
    user = User.find_by(email: email.downcase)
    if user.nil?
      raise InvalidCredentialsError, 'メールアドレスが正しくありません'
    elsif user.authenticate(password)
      access_token = encode_token(user.id)
      refresh_token = generate_refresh_token
      # バリデーションとコールバックをスキップして refresh_token のみを更新
      user.update_column(:refresh_token, refresh_token)
      Rails.logger.info "ユーザーのリフレッシュトークンを保存: #{user.refresh_token}" if Rails.env.development?
      { access_token: access_token, refresh_token: refresh_token, user: user }
    else
      raise InvalidCredentialsError, 'パスワードが正しくありません'
    end
  rescue ActiveRecord::RecordInvalid => e # update_column は RecordInvalid を発生させないが、念のため残す
    Rails.logger.error "ログイン成功後、リフレッシュトークン更新に失敗: #{e.message}"

    raise InvalidCredentialsError, "ログイン処理中にエラーが発生しました。"
  end

  # ユーザーを登録する
  def self.register(params)
    user = User.new(
      email: params[:email]&.downcase,
      username: params[:username],
      password: params[:password],
      password_confirmation: params[:password_confirmation]
    )
    if user.save
      access_token = encode_token(user.id)
      refresh_token = generate_refresh_token
      # バリデーションとコールバックをスキップして refresh_token のみを更新
      user.update_column(:refresh_token, refresh_token)
      Rails.logger.info "新規登録ユーザーのリフレッシュトークンを保存: #{user.refresh_token}" if Rails.env.development?
      { access_token: access_token, refresh_token: refresh_token, user: user }
    else
      raise RegistrationError, user.errors.full_messages.join(", ")
    end
  rescue ActiveRecord::RecordInvalid => e # update_column は RecordInvalid を発生させないが、念のため残す
     Rails.logger.error "ユーザー作成成功後、リフレッシュトークン更新に失敗: #{e.message}"
     raise RegistrationError, "ユーザー登録中にエラーが発生しました。"
  end

  # トライアルユーザーを作成する
  def self.create_trial_user(params)
    user = User.new(
      email: params[:email]&.downcase,
      username: params[:username],
      password: params[:password],
      password_confirmation: params[:password_confirmation],
      trial_user: true
    )
    if user.save
      access_token = encode_token(user.id)
      refresh_token = generate_refresh_token
      # バリデーションとコールバックをスキップして refresh_token のみを更新
      user.update_column(:refresh_token, refresh_token)
      Rails.logger.info "トライアルユーザーのリフレッシュトークンを保存: #{user.refresh_token}" if Rails.env.development?
      { access_token: access_token, refresh_token: refresh_token, user: user }
    else
      raise RegistrationError, user.errors.full_messages.join(", ")
    end
  rescue ActiveRecord::RecordInvalid => e # update_column は RecordInvalid を発生させないが、念のため残す
     Rails.logger.error "トライアルユーザー作成成功後、リフレッシュトークン更新に失敗: #{e.message}"
     raise RegistrationError, "トライアルユーザー登録中にエラーが発生しました。"
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
      Rails.logger.info "受け取ったトークン: #{token.inspect}" if Rails.env.development?

      decoded_array = JWT.decode(token, SECRET_KEY, true, { algorithm: 'HS256' })
      decoded = decoded_array[0]

      Rails.logger.info "デコード後のトークン情報: #{decoded.inspect}" if Rails.env.development?

      unless decoded.is_a?(Hash) && decoded['user_id'].present?
        Rails.logger.warn "JWT のデコード結果が無効です: #{decoded.inspect}"
        return nil
      end

      decoded
    rescue JWT::ExpiredSignature
      Rails.logger.warn "JWT トークンが期限切れです: #{token}"
      return nil
    rescue JWT::DecodeError => e
      Rails.logger.warn "JWT トークンのデコードに失敗しました。: #{token}, Error: #{e.message}"
      return nil
    end
  end

  # リフレッシュトークンを生成
  def self.refresh_token(refresh_token)
    Rails.logger.info "リフレッシュトークンを検証: #{refresh_token}" if Rails.env.development?
    user = find_user_by_refresh_token(refresh_token)
    new_access_token = encode_token(user.id)
    new_refresh_token = generate_refresh_token
    # バリデーションとコールバックをスキップして refresh_token のみを更新
    user.update_column(:refresh_token, new_refresh_token)
    Rails.logger.info "ユーザーのリフレッシュトークンを更新・保存: #{user.refresh_token}" if Rails.env.development?
    { access_token: new_access_token, refresh_token: new_refresh_token }
  rescue ActiveRecord::RecordInvalid => e # update_column は RecordInvalid を発生させないが、念のため残す
    Rails.logger.error "リフレッシュトークン検証成功後、DB更新に失敗: #{e.message}"
    raise InvalidRefreshTokenError, "トークンリフレッシュ処理中にエラーが発生しました。"
  end

  # リフレッシュトークンからユーザーを検索
  def self.find_user_by_refresh_token(refresh_token)
    Rails.logger.info "リフレッシュトークンからユーザーを検索: #{refresh_token}" if Rails.env.development?
    raise InvalidRefreshTokenError, 'リフレッシュトークンがありません' if refresh_token.blank?

    user = User.find_by(refresh_token: refresh_token)

    Rails.logger.info "User.find_by(refresh_token: ...)の結果: #{user.inspect}" if Rails.env.development?

    if user.nil?
      Rails.logger.warn "リフレッシュトークンがデータベースに存在しません: #{refresh_token}"
      raise InvalidRefreshTokenError, '無効なリフレッシュトークン'
    end

    Rails.logger.info "ユーザーが見つかりました: ユーザー ID: #{user.id}" if Rails.env.development?
    user
  end

  # リフレッシュトークンを生成
  def self.generate_refresh_token
    SecureRandom.urlsafe_base64(64)
  end

  private

  # JWTの有効期限を環境変数で設定する
  def self.jwt_expiration_time
    expiration_minutes = ENV.fetch('JWT_EXPIRATION_MINUTES', '15').to_i
    expiration_minutes.minutes.from_now.to_i
  end
end
