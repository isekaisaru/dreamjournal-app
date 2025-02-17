require 'jwt'

class AuthService
  SECRET_KEY = Rails.application.secret_key_base

  # JWTトークンを生成する
    def self.encode_token(user_id)
      payload = jwt_payload(user_id)
      JWT.encode(payload, SECRET_KEY)
    end
  
    # トークンをデコードする
    def self.decode_token(token)
      JWT.decode(token, SECRET_KEY, true, algorithm: 'HS256')[0]
    rescue JWT::ExpiredSignature 
      Rails.logger.warn "Expired JWT token: #{token}"
      { 'expired' => true } # トークンが期限切れ
    rescue JWT::DecodeError
      Rails.logger.warn "Invalid JWT token: #{token}"
      nil
    end

    # トークンをリフレッシュする
  def self.refresh_token(user)
    return { errors: I18n.t('errors.unauthorized')} unless user

    new_token = encode_token(user.id)
    { token: new_token, message: I18n.t('messages.token_refreshed') }
  end

  private

  # JWTペイロードを作成する
  def self.jwt_payload(user_id)
    {
      user_id: user_id,
      exp: jwt_expiration_time
    }
  end

  # JWTの有効期限を環境変数で設定する
  def self.jwt_expiration_time
    ENV.fetch('JWT_EXPIRATION_TIME', (24.hours).from_now.to_i).to_i
  end
end