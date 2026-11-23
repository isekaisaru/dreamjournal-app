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
  :email, :phone, :jwt, :session_id,
  # 夢日記の本文はユーザーの機微な自由記述のため、Railsの自動リクエストログ
  # （Parameters: {...}）に出さない。DreamsController#create の手動ログは
  # 別途削除済みだが、こちらは他コントローラ・将来の変更に対する保険。
  :title, :content,
  # 夢の検索語（GET /dreams?query=...）も夢の中身に近いので出さない。
  # Parameters の行と process_action の params が [FILTERED] になる。
  # URL のクエリ文字列は、Started の行（started_request_log_without_query.rb）と
  # 構造化ログ（structured_logging.rb）でまるごと出さない。filtered_path は
  # `;` やエンコードしたキー（q%75ery=...）で伏せきれないため。
  :query
]
