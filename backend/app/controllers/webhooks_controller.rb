class WebhooksController < ApplicationController
  # Rails API モードでは CSRF保護はデフォルトで無効のため、
  # verify_authenticity_token のスキップは不要。
  # JWT認証のみスキップする（WebhookはStripeサーバーが叩くため）
  skip_before_action :authorize_request, only: [:stripe]

  # POST /webhooks/stripe
  def stripe
    unless ENV['STRIPE_WEBHOOK_SECRET'].present?
      Rails.logger.error("[Webhook] STRIPE_WEBHOOK_SECRET が未設定です")
      return head :internal_server_error
    end

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

    begin
      ProcessedWebhookEvent.create!(stripe_event_id: event.id, processed_at: Time.current)
    rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid => e
      if duplicate_processed_webhook_event_error?(e)
        Rails.logger.info("[Webhook] 重複イベントをスキップ event_id=#{event.id}")
        return head :ok
      end

      raise
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

  private

  def duplicate_processed_webhook_event_error?(error)
    return true if error.is_a?(ActiveRecord::RecordNotUnique)
    return false unless error.is_a?(ActiveRecord::RecordInvalid)
    return false unless error.record.is_a?(ProcessedWebhookEvent)

    error.record.errors.added?(:stripe_event_id, :taken)
  end
end
