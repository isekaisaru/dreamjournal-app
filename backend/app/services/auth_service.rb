require 'jwt'

class AuthService
  class InvalidCredentialsError < StandardError; end
  class InvalidRefreshTokenError < StandardError; end
  class RegistrationError < StandardError; end

  SECRET_KEY = Rails.application.credentials.secret_key_base

  # ログイン処理
  def self.login(email, password)
    user = User.find_by(email: email.downcase)
    if user.nil?
      raise InvalidCredentialsError, 'メールアドレスが正しくありません'
    elsif user.authenticate(password)
      access_token = encode_token(user.id)
      refresh_token = generate_refresh_token
      user.update(refresh_token: refresh_token)
      Rails.logger.info "ユーザーのリフレッシュトークンを保存: #{user.refresh_token}" if Rails.env.development?
      { access_token: access_token, refresh_token: refresh_token, user: user }
    else
      raise InvalidCredentialsError, 'パスワードが正しくありません'
    end
  end

  # ユーザーを登録する
  def self.register(params)
    user = User.new(
      email: params[:email],
      username: params[:username],
      password: params[:password],
      password_confirmation: params[:password_confirmation]
    )
    if user.save
      token = encode_token(user.id)
      { user: user, token: token }
    else
      raise RegistrationError, user.errors.full_messages.join(", ")
    end
  end

  # トライアルユーザーを作成する
  def self.create_trial_user(params)
    user = User.new(
      name: params[:name],
      email: params[:email],
      password: params[:password],
      password_confirmation: params[:password_confirmation],
      trial_user: true
    )
    if user.save
      token = encode_token(user.id)
      { user_id: user.id, token: token }
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
      Rails.logger.info "受け取ったトークン: #{token.inspect}" if Rails.env.development?

      decoded_array = JWT.decode(token, SECRET_KEY, true, { algorithm: 'HS256' })
      decoded = decoded_array[0]

      Rails.logger.info "デコード後のトークン情報: #{decoded.inspect}" if Rails.env.development?

      if decoded.nil?
        Rails.logger.warn "JWT の decoded がnilです: #{decoded.inspect}"
        return nil
      end

      user_id = decoded['user_id']

      if user_id.nil?
        Rails.logger.warn "JWT の user_id がnilです: #{decoded.inspect}"
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

    if user.nil?
      Rails.logger.warn "無効なリフレッシュトークン: #{refresh_token}"
      raise InvalidRefreshTokenError, '無効なリフレッシュトークン'
    end

    new_access_token = encode_token(user.id)
    new_refresh_token = generate_refresh_token
    user.refresh_token = new_refresh_token
    user.update(refresh_token: new_refresh_token)
    Rails.logger.info "ユーザーのリフレッシュトークンを保存: #{user.refresh_token}" if Rails.env.development?
    { access_token: new_access_token, refresh_token: new_refresh_token, user: user }
  end

  # リフレッシュトークンからユーザーを検索
  def self.find_user_by_refresh_token(refresh_token)
    Rails.logger.info "リフレッシュトークンからユーザーを検索: #{refresh_token}" if Rails.env.development?
    raise InvalidRefreshTokenError, 'リフレッシュトークンがありません' if refresh_token.nil?

    user = User.find_by(refresh_token: refresh_token)

    Rails.logger.info "User.find_by(refresh_token: refresh_token)の結果: #{user.inspect}" if Rails.env.development?

    if user.nil?
      Rails.logger.warn "リフレッシュトークンがデータベースに存在しません: #{refresh_token}"
      return nil
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
    ENV.fetch('JWT_EXPIRATION_TIME', '86400').to_i.seconds.from_now.to_i
  end
end
