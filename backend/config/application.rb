require_relative 'boot'

require 'rails/all'

if %w[development test].include? ENV['RAILS_ENV']
  require 'dotenv/load'
end

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module App
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 7.0
    config.active_record.schema_format = :sql
    config.autoload_paths += [Rails.root.join('app/services'), Rails.root.join('lib')]
    config.debug_exception_response_format = :api
    
    # セキュリティヘッダーの追加
    config.force_ssl = false # 開発環境ではfalse、本番環境ではtrueに設定
    
    # セキュリティミドルウェアの設定
    config.middleware.use Rack::Deflater
    config.middleware.use Rack::Attack

    # Rails 7.2 には修正版が出ていない警告への暫定策。Rails 8.0.5.2 以降へ上げたら見直す。
    # - GHSA-v924-7rp8-4mxh: 添付時の解析で ffprobe / ffmpeg / ImageMagick が、アップロードされた
    #   ファイル名の拡張子からデコーダを選ぶ。このアプリは解析結果（音声の長さなど）を使わないので、
    #   外部ツールを呼ぶ analyzer と previewer を外す（文字起こしは AudioAnalysisService が別に行う）。
    # - GHSA-8474-xrp6-wh69: Action Cable の subscribe で DoS の恐れがある。Action Cable は使って
    #   いないので、/cable を routes に置かない。
    config.active_storage.analyzers = []
    config.active_storage.previewers = []
    config.action_cable.mount_path = nil

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")
  end
end
