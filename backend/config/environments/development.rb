require "active_support/core_ext/integer/time"

Rails.application.configure do
  # コード変更のたびにリロード（開発向け）
  config.enable_reloading = true
  config.eager_load = false

  # エラー画面は詳細表示
  config.consider_all_requests_local = true

  # Server-Timing
  config.server_timing = true

  # キャッシュ切替（rails dev:cache でトグル）
  if Rails.root.join("tmp/caching-dev.txt").exist?
    config.action_controller.perform_caching = true
    config.action_controller.enable_fragment_cache_logging = true
    config.cache_store = :memory_store
    config.public_file_server.headers = {
      "Cache-Control" => "public, max-age=#{2.days.to_i}"
    }
  else
    config.action_controller.perform_caching = false
    config.cache_store = :null_store
  end

  # Active Storage
  config.active_storage.service = :local

  # メール
  config.action_mailer.raise_delivery_errors = false
  config.action_mailer.perform_caching = false
  config.action_mailer.perform_deliveries = true
  config.action_mailer.delivery_method = :letter_opener
  config.action_mailer.default_url_options = { host: "localhost", port: 3001 }

  # Deprecation
  config.active_support.deprecation = :log
  config.active_support.disallowed_deprecation = :raise
  config.active_support.disallowed_deprecation_warnings = []

  # マイグレーション未実行でページロード時にエラー
  config.active_record.migration_error = :page_load

  # ログ（SQLやJobの箇所をハイライト）
  config.active_record.verbose_query_logs = true
  config.active_job.verbose_enqueue_logs = true

  # ログレベル（開発は :debug 推奨）
  config.log_level = :debug

  # Docker からの web-console を許可（172.18.0.0/16 など、実際のブリッジに合わせる）
  if defined?(WebConsole)
    config.web_console.permissions = '172.18.0.0/16'
  end

  # 必要ならホスト許可（Docker 経由アクセス用）
  # フロントエンドコンテナ(backend)からのリクエストを許可
  config.hosts << "backend"
end
