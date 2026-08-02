class WebhooksController < ApplicationController
  class InvalidCheckoutSessionPayloadError < StandardError; end
  class UnresolvedWebhookDataError < StandardError; end

  # Rails API モードでは CSRF保護はデフォルトで無効のため、
  # verify_authenticity_token のスキップは不要。
  # JWT認証のみスキップする（WebhookはStripeサーバーが叩くため）
  skip_before_action :authorize_request, only: [:stripe]
  # StripeはOriginヘッダーを送らないサーバー間通信のため、Origin検証も対象外にする。
  # 正当性は署名検証（Stripe-Signatureヘッダー、下記）で担保している。
  skip_before_action :verify_request_origin!, only: [:stripe]

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

    result = StripeWebhookEventProcessor.call(event.id) do
      dispatch_webhook_event(event)
    end

    if result == :duplicate
      PaymentsObservability.increment('webhook.event.duplicate', event_type: event.type)
      PaymentsObservability.log(event: 'webhook.event.duplicate', event_type: event.type, stripe_event_id: event.id)
      Rails.logger.info("[Webhook] 重複イベントをスキップ event_id=#{event.id}")
    end

    head :ok
  rescue InvalidCheckoutSessionPayloadError, UnresolvedWebhookDataError => e
    log_processing_error(event, e)
    head :internal_server_error
  rescue Stripe::StripeError => e
    log_processing_error(event, e)
    head :bad_gateway
  rescue => e
    log_processing_error(event, e)
    head :internal_server_error
  end

  private

  def dispatch_webhook_event(event)
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
  end

  def log_processing_error(event, error)
    event_type = event&.type || 'unknown'
    event_id = event&.id
    PaymentsObservability.increment('webhook.error.processing', event_type: event_type)
    PaymentsObservability.log(
      event: 'webhook.error.processing',
      level: :error,
      event_type: event_type,
      stripe_event_id: event_id,
      message: error.message
    )
    Rails.logger.error("[Webhook] processing failed event_id=#{event_id} type=#{event_type}: #{error.message}")
  end

  def handle_donation_checkout_completed(session, event_id)
    user = resolve_user_from_session(session)
    unless user
      log_unmatched_user(session, event_id, 'webhook.payment.unmatched_user')
      raise UnresolvedWebhookDataError, 'Webhook user could not be resolved'
    end

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
  end

  def handle_subscription_checkout_completed(session, event_id)
    user = resolve_user_from_session(session)
    unless user
      log_unmatched_user(session, event_id, 'webhook.subscription.unmatched_user')
      raise UnresolvedWebhookDataError, 'Subscription checkout user could not be resolved'
    end

    stripe_subscription_id = extract_object_id(session.subscription)
    stripe_customer_id = extract_object_id(session.customer)
    raise InvalidCheckoutSessionPayloadError, 'Stripe subscription checkout is missing subscription id' if stripe_subscription_id.blank?
    raise InvalidCheckoutSessionPayloadError, 'Stripe subscription checkout is missing customer id' if stripe_customer_id.blank?

    latest_subscription = Stripe::Subscription.retrieve(stripe_subscription_id)
    subscription, user = sync_subscription!(
      latest_subscription,
      preferred_user: user,
      fallback_customer_id: stripe_customer_id
    )

    PaymentsObservability.increment('webhook.subscription.started', user_id: user.id)
    PaymentsObservability.log(
      event: 'webhook.subscription.started',
      user_id: user.id,
      stripe_event_id: event_id,
      stripe_subscription_id: stripe_subscription_id
    )
    Rails.logger.info("[Webhook] サブスク開始 user_id=#{user.id} sub_id=#{stripe_subscription_id}")
  end

  def handle_invoice_payment_succeeded(invoice, event_id)
    stripe_subscription_id = extract_object_id(invoice.subscription)
    stripe_customer_id = extract_object_id(invoice.customer)
    raise InvalidCheckoutSessionPayloadError, 'Stripe invoice is missing subscription id' if stripe_subscription_id.blank?

    latest_subscription = Stripe::Subscription.retrieve(stripe_subscription_id)
    subscription, user = sync_subscription!(
      latest_subscription,
      fallback_customer_id: stripe_customer_id,
      fallback_current_period_end: extract_current_period_end(invoice)
    )

    PaymentsObservability.increment('webhook.subscription.invoice_paid', user_id: user.id)
    PaymentsObservability.log(
      event: 'webhook.subscription.invoice_paid',
      user_id: user.id,
      stripe_event_id: event_id,
      stripe_subscription_id: stripe_subscription_id
    )
    Rails.logger.info("[Webhook] 月次請求成功 user_id=#{user.id} sub_id=#{stripe_subscription_id}")
  end

  def handle_subscription_deleted(subscription_object, event_id)
    stripe_subscription_id = extract_object_id(subscription_object)
    raise InvalidCheckoutSessionPayloadError, 'Stripe subscription deletion is missing subscription id' if stripe_subscription_id.blank?

    subscription, user = sync_subscription!(subscription_object)

    PaymentsObservability.increment('webhook.subscription.deleted', user_id: user.id)
    PaymentsObservability.log(
      event: 'webhook.subscription.deleted',
      user_id: user.id,
      stripe_event_id: event_id,
      stripe_subscription_id: stripe_subscription_id
    )
    Rails.logger.info("[Webhook] サブスク解約 user_id=#{user.id} sub_id=#{stripe_subscription_id}")
  end

  def sync_subscription!(stripe_subscription, preferred_user: nil, fallback_customer_id: nil, fallback_current_period_end: nil)
    stripe_subscription_id = extract_object_id(stripe_subscription)
    subscription = Subscription.find_or_initialize_by(stripe_subscription_id: stripe_subscription_id)
    stripe_customer_id =
      if stripe_subscription.respond_to?(:customer)
        extract_object_id(stripe_subscription.customer).presence
      end
    stripe_customer_id ||= fallback_customer_id
    stripe_customer_id ||= subscription.stripe_customer_id

    status = stripe_subscription.respond_to?(:status) ? stripe_subscription.status.to_s : nil
    current_period_end =
      if stripe_subscription.respond_to?(:current_period_end)
        timestamp_to_time(stripe_subscription.current_period_end)
      end
    current_period_end ||= fallback_current_period_end

    raise InvalidCheckoutSessionPayloadError, 'Stripe subscription is missing id' if stripe_subscription_id.blank?
    raise InvalidCheckoutSessionPayloadError, 'Stripe subscription is missing customer id' if stripe_customer_id.blank?
    unless Subscription::STATUSES.include?(status)
      raise InvalidCheckoutSessionPayloadError, "Unsupported Stripe subscription status: #{status.presence || 'missing'}"
    end

    user = preferred_user || subscription.user || User.find_by(stripe_customer_id: stripe_customer_id)
    raise UnresolvedWebhookDataError, 'Subscription user could not be resolved' unless user

    subscription.assign_attributes(
      user: user,
      stripe_customer_id: stripe_customer_id,
      status: status,
      current_period_end: current_period_end
    )
    subscription.save!

    user.update!(
      stripe_customer_id: stripe_customer_id,
      premium: user.premium_active_subscription?
    )

    [subscription, user]
  end

  def resolve_user_from_session(session)
    user_id = session.respond_to?(:client_reference_id) ? session.client_reference_id.presence : nil
    user = User.find_by(id: user_id) if user_id.present?

    customer_id = extract_object_id(session.respond_to?(:customer) ? session.customer : nil)
    if user.nil? && User.column_names.include?('stripe_customer_id') && customer_id.present?
      user = User.find_by(stripe_customer_id: customer_id)
    end

    email = extract_customer_email(session)
    user ||= User.find_by(email: email) if email.present?
    user
  end

  def extract_customer_email(session)
    if session.respond_to?(:customer_details) && session.customer_details.respond_to?(:email)
      email = session.customer_details.email
      return email if email.present?
    end

    session.customer_email if session.respond_to?(:customer_email)
  end

  def extract_object_id(value)
    value.respond_to?(:id) ? value.id : value
  end

  def extract_current_period_end(invoice)
    if invoice.respond_to?(:lines) && invoice.lines.respond_to?(:data)
      line = invoice.lines.data.first
      if line&.respond_to?(:period) && line.period.respond_to?(:end)
        return timestamp_to_time(line.period.end)
      end
    end

    nil
  end

  def timestamp_to_time(value)
    return nil if value.blank?

    Time.zone.at(value)
  end

  def log_unmatched_user(session, event_id, metric_name)
    customer_id = extract_object_id(session.respond_to?(:customer) ? session.customer : nil)
    PaymentsObservability.increment(metric_name, event_type: 'checkout.session.completed')
    PaymentsObservability.log(
      event: metric_name,
      level: :warn,
      event_type: 'checkout.session.completed',
      stripe_event_id: event_id,
      stripe_customer_id: customer_id
    )
    Rails.logger.warn("[Webhook] ユーザーが見つかりません customer=#{customer_id}")
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
