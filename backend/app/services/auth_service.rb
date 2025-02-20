require 'jwt'

class AuthService
  SECRET_KEY = Rails.application.secret_key_base

  # JWTトークンを生成する
    def self.encode_token(user_id)
      raise ArgumentError, "User ID is missing" if user_id.nil?

      payload = { user_id: user_id, exp: jwt_expiration_time}
      JWT.encode(payload, SECRET_KEY, 'HS256')
    end
  
    # トークンをデコードする
    def self.decode_token(token)
      return nil if token.nil?

      begin
        decoded = JWT.decode(token, SECRET_KEY, true, algorithm: 'HS256')[0]

        # `user_id` が `nil` の場合はエラーとして処理 
        user_id = decoded['user_id']
        unless user_id.is_a?(Integer)
          Rails.logger.warn "Invalid JWT payload: #{decoded}"
          return nil
        end

        decoded
      rescue JWT::ExpiredSignature 
      Rails.logger.warn "Expired JWT token: #{token}"
      { 'expired' => true } # トークンが期限切れ
      rescue JWT::DecodeError => e
      Rails.logger.warn "Invalid JWT token: #{token}, Error: #{e.message}"
      nil
      end
    end

    # トークンをリフレッシュする
  def self.refresh_token(user)
    return { errors: I18n.t('errors.unauthorized')} unless user

    new_token = encode_token(user.id)
    { token: new_token, message: `トークンがリフレッシュされました。`}
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