require "active_support/core_ext/integer/time"

# The test environment is used exclusively to run your application's
# test suite. You never need to work with it otherwise. Remember that
# your test database is "scratch space" for the test suite and is wiped
# and recreated between test runs. Don't rely on the data there!

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Turn false under Spring and add eager_load = false to your config/spring.rb
  config.eager_load = false

  # Configure public file server for tests with Cache-Control for performance.
  config.public_file_server.enabled = true
  config.public_file_server.headers = {
    "Cache-Control" => "public, max-age=#{1.hour.to_i}"
  }

  # Show full error reports and disable caching.
  config.consider_all_requests_local       = true
  config.action_controller.perform_caching = false
  config.cache_store = :null_store

  # Raise exceptions instead of rendering exception templates.
  config.action_dispatch.show_exceptions = :rescuable

  # Disable request forgery protection in test environment.
  config.action_controller.allow_forgery_protection = false

  # Store uploaded files on the local file system in a temporary directory.
  config.active_storage.service = :test

  # =================================================================
  # ⭐️ ここが重要です！: メールとバックグラウンドジョブの設定
  # =================================================================

  # Action Mailerの設定
  # メールを実際に送信せず、テスト用の配列に保存します
  config.action_mailer.delivery_method = :test
  # メール送信処理を「実行する」設定です。これがfalseだと何も起こりません。
  config.action_mailer.perform_deliveries = true
  # メールの送信に失敗した場合にエラーを発生させます
  config.action_mailer.raise_delivery_errors = true
  # メール内のURLを正しく生成するための設定です
  config.action_mailer.default_url_options = { host: 'localhost', port: 3001 }

  # Active Jobの設定
  # deliver_laterのようなバックグラウンドジョブを即座に実行するようにします
  config.active_job.queue_adapter = :inline

  # Print deprecation notices to the stderr.
  config.active_support.deprecation = :stderr

  # Raise exceptions for disallowed deprecations.
  config.active_support.disallowed_deprecation = :raise

  # Tell Active Support which deprecation messages to disallow.
  config.active_support.disallowed_deprecation_warnings = []

  # Raises error for missing translations.
  # config.i18n.raise_on_missing_translations = true

  # Annotate rendered view with file names.
  # config.action_view.annotate_rendered_view_with_filenames = true
end
