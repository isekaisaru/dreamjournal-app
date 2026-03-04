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
      marker = ProcessedWebhookEvent.create!(stripe_event_id: event.id, processed_at: Time.current)
    rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid => e
      Rails.logger.info("[Webhook] 重複イベントをスキップ event_id=#{event.id}")
      return head :ok
    end

    begin
      # イベント種別ごとの処理
      case event.type
      when 'checkout.session.completed'
        session = event.data.object
        user = if User.column_names.include?('stripe_customer_id') && session.customer.present?
                 User.find_by(stripe_customer_id: session.customer)
               end
        email = session.customer_details&.email.presence || session.customer_email
        user ||= User.find_by(email: email)

        if user
          Payment.find_or_create_by!(stripe_session_id: session.id) do |payment|
            payment.user = user
            payment.amount = session.amount_total
            payment.status = 'completed'
          end
          Rails.logger.info("[Webhook] 支払い完了・DB保存 user_id=#{user.id} session_id=#{session.id}")
        else
          Rails.logger.warn("[Webhook] ユーザーが見つかりません customer=#{session.customer}")
        end
      else
        Rails.logger.info("[Webhook] 未処理イベント: #{event.type}")
      end
    rescue => e
      marker&.destroy!
      raise
    end

    head :ok
  end
end
