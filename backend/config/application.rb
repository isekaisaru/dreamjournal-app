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

    # 環境変数 POSTGRES_PASSWORD が設定されているか確認
    if ENV['POSTGRES_PASSWORD'].blank?
      raise "POSTGRES_PASSWORD environment variable is not set."
    end

    # CORS設定を追加
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins 'http://localhost:3000'
        resource '*', headers: :any, methods: [:get, :post, :put, :patch, :delete, :options, :head]
      end
    end

    config.autoload_paths << Rails.root.join('lib')
    config.debug_exception_response_format = :api

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