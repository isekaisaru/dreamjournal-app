class WebhooksController < ApplicationController
  # CSRF保護をスキップ（Stripeからのリクエストはformではないため）
  skip_before_action :verify_authenticity_token, only: [:stripe]

  # POST /webhooks/stripe
  # 今日のゴール：「入口がある状態」
  # 次回実装：Stripe署名検証（Stripe-Signature header）+ イベント種別のハンドリング
  def stripe
    Rails.logger.info("[Webhook] stripe event received")
    head :ok
  end
end
