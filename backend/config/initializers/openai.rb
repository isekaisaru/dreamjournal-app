require 'openai'

# Phase 1: CI/CDの迅速な問題解決のための修正 (Claude's suggestion)
# テスト環境でAPIキーが設定されていない場合、ダミーキーを設定してCIをパスさせる。
if Rails.env.test? && ENV['OPENAI_API_KEY'].blank?
  ENV['OPENAI_API_KEY'] = 'dummy-key-for-testing'
end

if ENV['OPENAI_API_KEY'].present?
  $openai_client = OpenAI::Client.new(access_token: ENV['OPENAI_API_KEY'])
else
  # 本番環境でキーがない場合のみエラーを発生させる。開発環境ではnilを許容。
  raise 'OPENAI_API_KEYが設定されていません。' if Rails.env.production?
  $openai_client = nil
end