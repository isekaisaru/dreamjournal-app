require 'openai'

Rails.logger.info "DEBUG: OPENAI_API_KEY=#{ENV['OPENAI_API_KEY']}"

if ENV['OPENAI_API_KEY'].blank?
  raise "OPENAI_API_KEYが設定されていません。"
end

# OpenAI クライアントの初期化（正しいオプションキーを使用）
$openai_client = OpenAI::Client.new(access_token: ENV['OPENAI_API_KEY'])