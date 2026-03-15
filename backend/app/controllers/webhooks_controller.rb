class WebhooksController < ApplicationController
  # Rails API モードでは CSRF保護はデフォルトで無効のため、
  # verify_authenticity_token のスキップは不要。
  # JWT認証のみスキップする（WebhookはStripeサーバーが叩くため）
  skip_before_action :authorize_request, only: [:stripe]

  # POST /webhooks/stripe
  def stripe
    PaymentsObservability.increment('webhook.request.total')

    unless ENV['STRIPE_WEBHOOK_SECRET'].present?
      PaymentsObservability.increment('webhook.error.secret_missing')
      PaymentsObservability.log(event: 'webhook.error.secret_missing', level: :error)
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
      PaymentsObservability.increment('webhook.error.invalid_json')
      PaymentsObservability.log(event: 'webhook.error.invalid_json', level: :warn, message: e.message)
      Rails.logger.warn("[Webhook] JSON parse error: #{e.message}")
      return head :bad_request
    rescue Stripe::SignatureVerificationError => e
      # 署名が一致しない（偽物のリクエストや改ざん）
      PaymentsObservability.increment('webhook.error.invalid_signature')
      PaymentsObservability.log(event: 'webhook.error.invalid_signature', level: :warn, message: e.message)
      Rails.logger.warn("[Webhook] Signature verification failed: #{e.message}")
      return head :bad_request
    end

    PaymentsObservability.increment('webhook.event.received', event_type: event.type)
    PaymentsObservability.log(event: 'webhook.event.received', event_type: event.type, stripe_event_id: event.id)

    begin
      marker = ProcessedWebhookEvent.create!(stripe_event_id: event.id, processed_at: Time.current)
    rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid => e
      PaymentsObservability.increment('webhook.event.duplicate', event_type: event.type)
      PaymentsObservability.log(event: 'webhook.event.duplicate', event_type: event.type, stripe_event_id: event.id)
      Rails.logger.info("[Webhook] 重複イベントをスキップ event_id=#{event.id}")
      return head :ok
    end

    begin
      # イベント種別ごとの処理
      case event.type
      when 'checkout.session.completed'
        session = event.data.object
        user = User.find_by(id: session.client_reference_id)
        user ||= if User.column_names.include?('stripe_customer_id') && session.customer.present?
                 User.find_by(stripe_customer_id: session.customer)
               end
        email = session.customer_details&.email.presence || session.customer_email
        user ||= User.find_by(email: email)

        if user
          payment_attributes = payment_attributes_from_session(session)
          payment = Payment.find_or_initialize_by(stripe_checkout_session_id: session.id)
          payment.user = user
          payment.assign_attributes(payment_attributes)
          payment.save!
          PaymentsObservability.increment('webhook.payment.saved', event_type: event.type, user_id: user.id)
          PaymentsObservability.log(
            event: 'webhook.payment.saved',
            event_type: event.type,
            user_id: user.id,
            stripe_event_id: event.id,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: payment.stripe_payment_intent_id
          )
          Rails.logger.info("[Webhook] 支払い完了・DB保存 user_id=#{user.id} session_id=#{session.id}")
        else
          PaymentsObservability.increment('webhook.payment.unmatched_user', event_type: event.type)
          PaymentsObservability.log(
            event: 'webhook.payment.unmatched_user',
            level: :warn,
            event_type: event.type,
            stripe_event_id: event.id,
            stripe_customer_id: session.customer
          )
          Rails.logger.warn("[Webhook] ユーザーが見つかりません customer=#{session.customer}")
        end
      else
        PaymentsObservability.increment('webhook.event.unhandled', event_type: event.type)
        PaymentsObservability.log(event: 'webhook.event.unhandled', event_type: event.type, stripe_event_id: event.id)
        Rails.logger.info("[Webhook] 未処理イベント: #{event.type}")
      end
    rescue => e
      PaymentsObservability.increment('webhook.error.processing', event_type: event.type)
      PaymentsObservability.log(
        event: 'webhook.error.processing',
        level: :error,
        event_type: event.type,
        stripe_event_id: event.id,
        message: e.message
      )
      marker&.destroy!
      raise
    end

    head :ok
  end

  private

  def extract_payment_intent_id(payment_intent)
    payment_intent.respond_to?(:id) ? payment_intent.id : payment_intent
  end

  def payment_attributes_from_session(session)
    amount = session.amount_total
    currency = session.currency
    status = session.payment_status

    raise ArgumentError, 'Stripe checkout.session.completed is missing amount_total' if amount.nil?
    raise ArgumentError, 'Stripe checkout.session.completed is missing currency' if currency.blank?
    raise ArgumentError, 'Stripe checkout.session.completed is missing payment_status' if status.blank?

    {
      stripe_payment_intent_id: extract_payment_intent_id(session.payment_intent),
      amount: amount,
      currency: currency,
      status: status
    }
  end
end
