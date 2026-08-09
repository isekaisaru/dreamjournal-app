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

  # 本番環境と開発環境でのみ有効化（テスト環境は除外）
  config.enabled_environments = %w[production development]

  # 送信前にイベントを加工・フィルタリングする場合
  # 送信前にイベントからセンシティブな情報を落とす。
  #
  # sentry-rails の ActiveJob 連携は、ジョブ例外時に extra へ
  # ジョブ引数（arguments）を丸ごと入れて送る。
  # ActionMailer::MailDeliveryJob の引数にはパスワード再設定・
  # メールアドレス確認の生トークンが含まれるため、ここでマスクする。
  # production.rb の active_job.log_arguments = false は Rails のログにしか
  # 効かず、この経路は塞げない。詳細は lib/sentry_job_arguments_filter.rb 参照。
  #
  # 定数は呼び出し時に解決されるので、初期化順序の影響を受けない。
  config.before_send = lambda do |event, _hint|
    SentryJobArgumentsFilter.call(event)
  end
end
