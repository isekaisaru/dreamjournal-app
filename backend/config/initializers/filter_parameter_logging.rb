# Be sure to restart your server when you modify this file.

# Configure parameters to be partially matched (e.g. passw matches password) and filtered from the log file.
# Use this to limit dissemination of sensitive information.
# See the ActiveSupport::ParameterFilter documentation for supported notations and behaviors.
# セキュリティ強化：認証情報・機密データのログフィルタリング
Rails.application.config.filter_parameters += [
  :passw, :password, :password_confirmation,
  :secret, :token, :access_token, :refresh_token, 
  :authorization, :bearer, :api_key,
  :_key, :crypt, :salt, :certificate, :otp, :ssn,
  :email, :phone, :jwt, :session_id
]
