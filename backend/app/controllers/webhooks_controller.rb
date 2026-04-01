class WebhooksController < ApplicationController
  class InvalidCheckoutSessionPayloadError < StandardError; end

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
        if session.mode == 'subscription'
          handle_subscription_checkout_completed(session, event.id)
        else
          handle_donation_checkout_completed(session, event.id)
        end
      when 'invoice.payment_succeeded'
        handle_invoice_payment_succeeded(event.data.object, event.id)
      when 'customer.subscription.deleted'
        handle_subscription_deleted(event.data.object, event.id)
      else
        PaymentsObservability.increment('webhook.event.unhandled', event_type: event.type)
        PaymentsObservability.log(event: 'webhook.event.unhandled', event_type: event.type, stripe_event_id: event.id)
        Rails.logger.info("[Webhook] 未処理イベント: #{event.type}")
      end
    rescue InvalidCheckoutSessionPayloadError => e
      PaymentsObservability.increment('webhook.error.processing', event_type: event.type)
      PaymentsObservability.log(
        event: 'webhook.error.processing',
        level: :error,
        event_type: event.type,
        stripe_event_id: event.id,
        message: e.message
      )
      marker&.destroy!
      Rails.logger.error("[Webhook] checkout.session.completed payload invalid: #{e.message}")
      return head :internal_server_error
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

  def resolve_user_from_session(session)
    user = User.find_by(id: session.client_reference_id)
    user ||= if User.column_names.include?('stripe_customer_id') && session.customer.present?
               User.find_by(stripe_customer_id: session.customer)
             end
    email = session.customer_details&.email.presence || session.customer_email
    user ||= User.find_by(email: email)
    user
  end

  def handle_donation_checkout_completed(session, event_id)
    user = resolve_user_from_session(session)

    if user
      payment_attributes = payment_attributes_from_session(session)
      payment = Payment.find_or_initialize_by(stripe_checkout_session_id: session.id)
      payment.user = user
      payment.assign_attributes(payment_attributes)
      payment.save!
      PaymentsObservability.increment('webhook.payment.saved', event_type: 'checkout.session.completed', user_id: user.id)
      PaymentsObservability.log(
        event: 'webhook.payment.saved',
        event_type: 'checkout.session.completed',
        user_id: user.id,
        stripe_event_id: event_id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: payment.stripe_payment_intent_id
      )
      Rails.logger.info("[Webhook] 支払い完了・DB保存 user_id=#{user.id} session_id=#{session.id}")
    else
      PaymentsObservability.increment('webhook.payment.unmatched_user', event_type: 'checkout.session.completed')
      PaymentsObservability.log(
        event: 'webhook.payment.unmatched_user',
        level: :warn,
        event_type: 'checkout.session.completed',
        stripe_event_id: event_id,
        stripe_customer_id: session.customer
      )
      Rails.logger.warn("[Webhook] ユーザーが見つかりません customer=#{session.customer}")
    end
  end

  def handle_subscription_checkout_completed(session, event_id)
    user = resolve_user_from_session(session)

    unless user
      PaymentsObservability.increment('webhook.subscription.unmatched_user')
      PaymentsObservability.log(
        event: 'webhook.subscription.unmatched_user',
        level: :warn,
        stripe_event_id: event_id,
        stripe_customer_id: session.customer
      )
      Rails.logger.warn("[Webhook] サブスク: ユーザーが見つかりません customer=#{session.customer}")
      return
    end

    stripe_subscription_id = session.subscription.respond_to?(:id) ? session.subscription.id : session.subscription

    subscription = Subscription.find_or_initialize_by(stripe_subscription_id: stripe_subscription_id)
    subscription.user = user
    subscription.stripe_customer_id = session.customer
    subscription.status = 'active'
    subscription.save!

    user.update!(premium: true)

    PaymentsObservability.increment('webhook.subscription.activated', user_id: user.id)
    PaymentsObservability.log(
      event: 'webhook.subscription.activated',
      user_id: user.id,
      stripe_event_id: event_id,
      stripe_subscription_id: stripe_subscription_id
    )
    Rails.logger.info("[Webhook] サブスク開始 user_id=#{user.id} sub_id=#{stripe_subscription_id}")
  end

  def handle_invoice_payment_succeeded(invoice, event_id)
    stripe_subscription_id = invoice.subscription.respond_to?(:id) ? invoice.subscription.id : invoice.subscription
    return if stripe_subscription_id.blank?

    subscription = Subscription.find_by(stripe_subscription_id: stripe_subscription_id)
    unless subscription
      Rails.logger.info("[Webhook] invoice.payment_succeeded: 対応するサブスクが見つかりません sub_id=#{stripe_subscription_id}")
      return
    end

    period_end = invoice.respond_to?(:period_end) && invoice.period_end.present? ?
                   Time.at(invoice.period_end) : nil

    subscription.update!(
      status: 'active',
      current_period_end: period_end
    )

    PaymentsObservability.increment('webhook.subscription.invoice_paid', user_id: subscription.user_id)
    PaymentsObservability.log(
      event: 'webhook.subscription.invoice_paid',
      user_id: subscription.user_id,
      stripe_event_id: event_id,
      stripe_subscription_id: stripe_subscription_id
    )
    Rails.logger.info("[Webhook] 月次請求成功 user_id=#{subscription.user_id} sub_id=#{stripe_subscription_id}")
  end

  def handle_subscription_deleted(stripe_sub, event_id)
    stripe_subscription_id = stripe_sub.respond_to?(:id) ? stripe_sub.id : stripe_sub.to_s

    subscription = Subscription.find_by(stripe_subscription_id: stripe_subscription_id)
    unless subscription
      Rails.logger.info("[Webhook] customer.subscription.deleted: 対応するサブスクが見つかりません sub_id=#{stripe_subscription_id}")
      return
    end

    subscription.update!(status: 'canceled')
    subscription.user.update!(premium: false)

    PaymentsObservability.increment('webhook.subscription.canceled', user_id: subscription.user_id)
    PaymentsObservability.log(
      event: 'webhook.subscription.canceled',
      user_id: subscription.user_id,
      stripe_event_id: event_id,
      stripe_subscription_id: stripe_subscription_id
    )
    Rails.logger.info("[Webhook] サブスクキャンセル user_id=#{subscription.user_id} sub_id=#{stripe_subscription_id}")
  end

  def extract_payment_intent_id(payment_intent)
    payment_intent.respond_to?(:id) ? payment_intent.id : payment_intent
  end

  def payment_attributes_from_session(session)
    amount = session.amount_total
    currency = session.currency
    status = session.payment_status

    raise InvalidCheckoutSessionPayloadError, 'Stripe checkout.session.completed is missing amount_total' if amount.nil?
    raise InvalidCheckoutSessionPayloadError, 'Stripe checkout.session.completed is missing currency' if currency.blank?
    raise InvalidCheckoutSessionPayloadError, 'Stripe checkout.session.completed is missing payment_status' if status.blank?

    {
      stripe_payment_intent_id: extract_payment_intent_id(session.payment_intent),
      amount: amount,
      currency: currency,
      status: status
    }
  end
end
