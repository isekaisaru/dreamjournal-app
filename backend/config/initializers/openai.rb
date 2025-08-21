require 'openai'

Rails.logger.info "DEBUG: OPENAI_API_KEY=#{ENV['OPENAI_API_KEY']}"

if ENV['OPENAI_API_KEY'].blank?
  if Rails.env.development?
    Rails.logger.warn "⚠️ OPENAI_API_KEY が設定されていません（開発環境では処理を継続）"
    $openai_client = nil
  else
    raise "OPENAI_API_KEYが設定されていません。"
  end
else
  # OpenAI クライアントの初期化（正しいオプションキーを使用）
  $openai_client = OpenAI::Client.new(access_token: ENV['OPENAI_API_KEY'])
end