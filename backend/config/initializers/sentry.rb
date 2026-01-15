# frozen_string_literal: true

Sentry.init do |config|
  # DSNは環境変数から取得（Render/本番環境で設定）
  config.dsn = ENV["SENTRY_DSN"]

  # 現在の環境（development, test, production）を設定
  config.environment = Rails.env

  # Breadcrumbs（パンくずリスト）を無効化する場合は以下をアンコメント
  # config.breadcrumbs_logger = [:active_support_logger, :http_logger]

  # トレースサンプルレート（パフォーマンス監視）
  # 開発/検証時は100%、本番では10%程度に下げることを推奨
  config.traces_sample_rate = Rails.env.production? ? 0.1 : 1.0

  # プロファイリング（任意）
  # config.profiles_sample_rate = 1.0

  # 本番環境でのみ有効化する場合（テスト完了後にコメントを外す）
  # config.enabled_environments = %w[production staging]

  # 送信前にイベントを加工・フィルタリングする場合
  config.before_send = lambda do |event, hint|
    # パスワードなどセンシティブな情報をフィルタリング
    event
  end
end
