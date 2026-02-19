class WebhooksController < ApplicationController
  # StripeはブラウザのフォームではなくサーバーサイドからPOSTするため、
  # CSRF保護・JWT認証の両方をスキップする必要がある。
  # （JWT認証をスキップしないと、Stripeが叩いた瞬間に401 Unauthorizedになる）
  skip_before_action :verify_authenticity_token, only: [:stripe]
  skip_before_action :authorize_request, only: [:stripe]

  # POST /webhooks/stripe
  # 今日のゴール：「入口がある状態」
  # 次回実装：Stripe署名検証（Stripe-Signature header）+ イベント種別のハンドリング
  #
  # ⚠️ 次回メモ：署名検証には request.raw_post を使うこと（request.body.read は不可）
  #   sig_header = request.headers['Stripe-Signature']
  #   payload    = request.raw_post
  #   event      = Stripe::Webhook.construct_event(payload, sig_header, ENV['STRIPE_WEBHOOK_SECRET'])
  def stripe
    Rails.logger.info("[Webhook] stripe event received")
    head :ok
  end
end
