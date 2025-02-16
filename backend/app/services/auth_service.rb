require 'jwt'

class AuthService
  SECRET_KEY = Rails.application.credentials.secret_key_base

  # JWTトークンを生成する
    def self.encode_token(payload, exp = 24.hours.from_now)
      payload[:exp] = exp.to_i
      JWT.encode(payload, SECRET_KEY)
    end
  
    # トークンをデコードする
    def self.decode_token(token)
      JWT.decode(token, SECRET_KEY, true, algorithm: 'HS256')[0]
    rescue JWT::ExpiredSignature 
      { 'expired' => true } # トークンが期限切れ
    rescue JWT::DecodeError
      nil
    end

    # トークンをリフレッシュする
  def self.refresh_token(user)
    if user
      new_token = encode_token({ user_id: user.id })
      { token: new_token, message: 'トークンが更新されました。' }
    else
      { errors: 'ユーザーが認証されていません。' }
    end
  end

end