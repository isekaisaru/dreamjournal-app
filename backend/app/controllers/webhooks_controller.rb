class WebhooksController < ApplicationController
  # Rails API モードでは CSRF保護はデフォルトで無効のため、
  # verify_authenticity_token のスキップは不要。
  # JWT認証のみスキップする（WebhookはStripeサーバーが叩くため）
  skip_before_action :authorize_request, only: [:stripe]

  # POST /webhooks/stripe
  def stripe
    payload    = request.raw_post
    sig_header = request.headers['Stripe-Signature']

    begin
      event = Stripe::Webhook.construct_event(
        payload, sig_header, ENV['STRIPE_WEBHOOK_SECRET']
      )
    rescue JSON::ParserError => e
      # リクエストボディが不正なJSON
      Rails.logger.warn("[Webhook] JSON parse error: #{e.message}")
      return head :bad_request
    rescue Stripe::SignatureVerificationError => e
      # 署名が一致しない（偽物のリクエストや改ざん）
      Rails.logger.warn("[Webhook] Signature verification failed: #{e.message}")
      return head :bad_request
    end

    # イベント種別ごとの処理
    case event.type
    when 'checkout.session.completed'
      session = event.data.object
      Rails.logger.info("[Webhook] 支払い完了 session_id=#{session.id} amount=#{session.amount_total}")
      # TODO: 次回実装 → DB保存（Paymentモデル）or 寄付フラグの更新
    else
      Rails.logger.info("[Webhook] 未処理イベント: #{event.type}")
    end

    head :ok
  end
end

