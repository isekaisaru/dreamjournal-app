require 'timeout'

class CheckoutController < ApplicationController
  class MissingPremiumPriceIdError < StandardError; end
  class CheckoutAlreadyCompletedError < StandardError; end
  class CheckoutAttemptConflictError < StandardError; end

  # 決済前にメールアドレス確認を必須にする（領収書・重要通知の到達性を担保）。
  # 実装は ApplicationController#require_verified_email（AI課金系と共通）。
  before_action :require_verified_email, only: [:create]

  DONATION_UNIT_AMOUNT = 500

  def create
    started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    checkout_attempt = nil
    PaymentsObservability.increment('checkout.request.total', user_id: current_user.id)
    PaymentsObservability.log(event: 'checkout.request.received', user_id: current_user.id)

    begin
      plan = requested_plan

      # FRONTEND_URL must be absolute URL for Stripe redirect
      frontend_url = ENV['FRONTEND_URL']
      if frontend_url.blank?
        PaymentsObservability.increment('checkout.error.frontend_url_missing')
        PaymentsObservability.log(event: 'checkout.error.frontend_url_missing', level: :error, user_id: current_user.id)
        Rails.logger.error "FRONTEND_URL is not set. Cannot create Stripe session."
        return render json: { error: 'FRONTEND_URLが設定されていません。' }, status: :internal_server_error
      end

      if plan == 'premium' && current_user.premium?
        return render json: { error: 'すでにプレミアム会員です。' }, status: :unprocessable_content
      end

      premium_price_id = verified_premium_price_id! if plan == 'premium'
      price_reference = checkout_price_reference(plan, premium_price_id)
      checkout_attempt = find_or_create_checkout_attempt!(plan: plan, price_reference: price_reference)

      if checkout_attempt.price_reference != price_reference
        raise CheckoutAttemptConflictError
      end

      if checkout_attempt.stripe_checkout_session_id.present?
        begin
          session = Stripe::Checkout::Session.retrieve(checkout_attempt.stripe_checkout_session_id)
        rescue Stripe::InvalidRequestError => e
          # 保存済みSessionがStripe上に存在しないことが確定した場合だけAttemptを終了する。
          checkout_attempt.transition_after_invalid_session!
          log_attempt(checkout_attempt, 'checkout.attempt.invalid_session', level: :warn, error_class: e.class.name)
          checkout_attempt = create_checkout_attempt!(plan: plan, price_reference: price_reference)
          session = nil
        end

        if session
          case session.status
          when 'expired'
            checkout_attempt.update!(status: 'expired')
            log_attempt(checkout_attempt, 'checkout.attempt.expired')
            checkout_attempt = create_checkout_attempt!(plan: plan, price_reference: price_reference)
          when 'complete'
            # completedへの遷移はpremium/subscription更新と同じWebhook transactionだけで行う。
            # Webhook到着まではactiveなopenとして保持し、2件目のCheckout作成を防ぐ。
            persist_checkout_session!(checkout_attempt, session)
            log_attempt(checkout_attempt, 'checkout.attempt.awaiting_webhook')
            raise CheckoutAlreadyCompletedError
          else
            persist_checkout_session!(checkout_attempt, session)
            log_attempt(checkout_attempt, 'checkout.attempt.reused', stripe_request_id: stripe_request_id_from(session))
            return render json: { url: session.url }, status: :ok
          end
        end
      end

      customer_id = ensure_stripe_customer_id!(checkout_attempt)

      session = Stripe::Checkout::Session.create(
        build_checkout_session_params(
          plan: plan,
          frontend_url: frontend_url,
          customer_id: customer_id,
          premium_price_id: premium_price_id
        ),
        idempotency_key: checkout_attempt.idempotency_key
      )

      persist_checkout_session!(checkout_attempt, session)

      PaymentsObservability.increment('checkout.session.created', user_id: current_user.id)
      PaymentsObservability.log(
        event: 'checkout.session.created',
        user_id: current_user.id,
        stripe_customer_id: customer_id,
        stripe_session_id: session.id,
        plan: params[:plan].presence || 'donation'
      )
      log_attempt(checkout_attempt, 'checkout.attempt.open', stripe_request_id: stripe_request_id_from(session))

      render json: { url: session.url }, status: :ok
    rescue CheckoutAlreadyCompletedError
      render json: { error: 'この決済はすでに完了しています。反映をお待ちください。' }, status: :conflict
    rescue CheckoutAttemptConflictError
      render json: { error: '以前の決済処理を確認中です。時間をおいて再度お試しください。' }, status: :conflict
    rescue MissingPremiumPriceIdError => e
      PaymentsObservability.increment('checkout.error.premium_price_missing', user_id: current_user.id)
      PaymentsObservability.log(event: 'checkout.error.premium_price_missing', level: :error, user_id: current_user.id)
      Rails.logger.error "Checkout configuration error class=#{e.class.name}"
      render json: { error: 'プレミアム決済の設定が未完了です。' }, status: :internal_server_error
    rescue StripeEnvironmentGuard::ConfigurationError => e
      PaymentsObservability.increment('checkout.error.stripe_mode_mismatch', user_id: current_user.id)
      PaymentsObservability.log(event: 'checkout.error.stripe_mode_mismatch', level: :error, user_id: current_user.id)
      Rails.logger.error "Checkout configuration error class=#{e.class.name}"
      render json: { error: 'プレミアム決済の設定が一致していません。' }, status: :internal_server_error
    rescue Timeout::Error => e
      mark_attempt!(checkout_attempt, 'uncertain', event: 'checkout.attempt.timeout', error: e)
      render json: { error: 'Stripeとの通信がタイムアウトしました。時間をおいて再度お試しください。' }, status: :gateway_timeout
    rescue Stripe::APIConnectionError => e
      mark_attempt!(checkout_attempt, 'uncertain', event: 'checkout.attempt.connection_error', error: e)
      render json: { error: 'Stripeへ一時的に接続できません。時間をおいて再度お試しください。' }, status: :service_unavailable
    rescue Stripe::RateLimitError => e
      mark_attempt!(checkout_attempt, 'uncertain', event: 'checkout.attempt.rate_limited', error: e)
      render json: { error: '決済サービスが混み合っています。時間をおいて再度お試しください。' }, status: :too_many_requests
    rescue Stripe::APIError => e
      mark_attempt!(checkout_attempt, 'uncertain', event: 'checkout.attempt.api_error', error: e)
      render json: { error: 'Stripeで一時的な問題が発生しました。時間をおいて再度お試しください。' }, status: :service_unavailable
    rescue Stripe::IdempotencyError => e
      mark_attempt!(checkout_attempt, 'uncertain', event: 'checkout.attempt.idempotency_error', error: e)
      render json: { error: '同じ決済処理を確認中です。時間をおいて再度お試しください。' }, status: :conflict
    rescue Stripe::InvalidRequestError => e
      mark_attempt!(checkout_attempt, 'failed', event: 'checkout.attempt.invalid_request', error: e)
      render json: { error: '決済情報を確認できませんでした。' }, status: :unprocessable_content
    rescue Stripe::StripeError => e
      # 未分類のStripeエラーはStripe側での成否を断定せず、安全側のuncertainに保つ。
      mark_attempt!(checkout_attempt, 'uncertain', event: 'checkout.attempt.stripe_error', error: e)
      PaymentsObservability.increment('checkout.error.stripe', user_id: current_user.id)
      render json: { error: 'Stripe決済の状態を確認できませんでした。時間をおいて再度お試しください。' }, status: :service_unavailable
    rescue => e
      PaymentsObservability.increment('checkout.error.unexpected', user_id: current_user.id)
      log_attempt(checkout_attempt, 'checkout.error.unexpected', level: :error, error_class: e.class.name)
      Rails.logger.error "Checkout error class=#{e.class.name} checkout_attempt_id=#{checkout_attempt&.id}"
      render json: { error: '予期しないエラーが発生しました。' }, status: :internal_server_error
    ensure
      if checkout_attempt
        elapsed_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round
        log_attempt(checkout_attempt, 'checkout.attempt.finished', elapsed_ms: elapsed_ms)
      end
    end
  end

  def show_session
    session_id = params[:session_id].to_s
    return render json: { error: 'session_id が必要です。' }, status: :bad_request if session_id.blank?

    session = Stripe::Checkout::Session.retrieve(session_id)
    return render json: { error: 'プレミアム決済のセッションではありません。' }, status: :unprocessable_content unless session.mode == 'subscription'

    session_user_id = extract_session_user_id(session)
    if session_user_id != current_user.id.to_s
      return render json: { error: 'この決済セッションへのアクセス権限がありません。' }, status: :forbidden
    end

    unless session.status == 'complete'
      return render json: { error: '決済がまだ完了していません。' }, status: :unprocessable_content
    end

    render json: {
      verified: true,
      session_id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      premium: current_user.premium?
    }, status: :ok
  rescue Stripe::InvalidRequestError => e
    PaymentsObservability.increment('checkout.session_lookup.invalid', user_id: current_user.id)
    PaymentsObservability.log(event: 'checkout.session_lookup.invalid', level: :warn, user_id: current_user.id, stripe_session_id: session_id, error_class: e.class.name)
    render json: { error: '決済セッションが見つかりません。' }, status: :not_found
  rescue Stripe::StripeError => e
    PaymentsObservability.increment('checkout.session_lookup.error', user_id: current_user.id)
    PaymentsObservability.log(event: 'checkout.session_lookup.error', level: :error, user_id: current_user.id, stripe_session_id: session_id, error_class: e.class.name)
    render json: { error: '決済確認に失敗しました。' }, status: :bad_gateway
  end

  private

  def requested_plan
    params[:plan].to_s == 'premium' ? 'premium' : 'donation'
  end

  def build_checkout_session_params(plan:, frontend_url:, customer_id:, premium_price_id: nil)
    base_params = {
      customer: customer_id,
      client_reference_id: current_user.id.to_s,
      metadata: {
        user_id: current_user.id.to_s,
        plan: plan
      },
      payment_method_types: ['card']
    }

    if plan == 'premium'
      base_params.merge(premium_session_params(frontend_url, premium_price_id))
    else
      base_params.merge(donation_session_params(frontend_url))
    end
  end

  def donation_session_params(frontend_url)
    {
      line_items: [{
        price_data: {
          currency: 'jpy',
          unit_amount: DONATION_UNIT_AMOUNT,
          product_data: {
            name: 'ユメログへの応援寄付',
            description: 'あなたの夢日記アプリ開発を応援してくれてありがとう！'
          }
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: "#{frontend_url}/donation/success",
      cancel_url: "#{frontend_url}/donation/cancel"
    }
  end

  def verified_premium_price_id!
    price_id = ENV['STRIPE_PREMIUM_PRICE_ID']
    raise MissingPremiumPriceIdError, 'STRIPE_PREMIUM_PRICE_ID is not set' if price_id.blank?

    price = Stripe::Price.retrieve(price_id)
    StripeEnvironmentGuard.validate_price!(
      price: price,
      mode: Rails.configuration.stripe[:mode]
    )
    price_id
  end

  def premium_session_params(frontend_url, price_id)
    {
      line_items: [{
        price: price_id,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: "#{frontend_url}/subscription/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "#{frontend_url}/subscription/cancel"
    }
  end

  def checkout_price_reference(plan, premium_price_id)
    plan == 'premium' ? premium_price_id : "donation:jpy:#{DONATION_UNIT_AMOUNT}"
  end

  def find_or_create_checkout_attempt!(plan:, price_reference:)
    CheckoutAttempt.find_or_create_recoverable!(
      user: current_user,
      plan: plan,
      attributes: checkout_attempt_attributes(plan, price_reference)
    )
  end

  def create_checkout_attempt!(plan:, price_reference:)
    find_or_create_checkout_attempt!(plan: plan, price_reference: price_reference)
  end

  def checkout_attempt_attributes(plan, price_reference)
    {
      plan: plan,
      price_reference: price_reference,
      idempotency_key: SecureRandom.uuid,
      customer_idempotency_key: customer_idempotency_key_for_current_user,
      status: 'pending'
    }
  end

  def ensure_stripe_customer_id!(checkout_attempt)
    candidate_id = current_user.with_lock do
      current_user.reload
      current_user.stripe_customer_id.presence || checkout_attempt.stripe_customer_id.presence
    end

    if candidate_id.present?
      begin
        customer = Stripe::Customer.retrieve(candidate_id)
        unless customer.respond_to?(:deleted) && customer.deleted
          PaymentsObservability.increment('checkout.customer.reused', user_id: current_user.id)
          PaymentsObservability.log(event: 'checkout.customer.reused', user_id: current_user.id, stripe_customer_id: candidate_id)
          return persist_customer_reference!(checkout_attempt, candidate_id)
        end
      rescue Stripe::InvalidRequestError => e
        # retrieveの無効な参照だけを新規作成へフォールバックする。
        # Customer.create自体のInvalidRequestErrorは再試行せず外側でfailedにする。
        PaymentsObservability.increment('checkout.customer.invalid_reference', user_id: current_user.id)
        PaymentsObservability.log(
          event: 'checkout.customer.invalid_reference',
          level: :warn,
          user_id: current_user.id,
          stripe_customer_id: candidate_id,
          error_class: e.class.name
        )
      end

      PaymentsObservability.increment('checkout.customer.deleted', user_id: current_user.id) if customer&.deleted
    end

    existing_id, idempotency_key = current_user.with_lock do
      current_user.reload
      if current_user.stripe_customer_id.present? && current_user.stripe_customer_id != candidate_id
        [current_user.stripe_customer_id, nil]
      else
        current_user.update!(stripe_customer_id: nil) if current_user.stripe_customer_id == candidate_id
        [nil, customer_idempotency_key_for_current_user]
      end
    end

    return persist_customer_reference!(checkout_attempt, existing_id) if existing_id.present?

    create_and_save_stripe_customer!(checkout_attempt, idempotency_key)
  end

  def create_and_save_stripe_customer!(checkout_attempt, idempotency_key)
    customer = Stripe::Customer.create(
      {
        email: current_user.email,
        name: current_user.username,
        metadata: { user_id: current_user.id.to_s }
      },
      idempotency_key: idempotency_key
    )
    PaymentsObservability.increment('checkout.customer.created', user_id: current_user.id)
    PaymentsObservability.log(event: 'checkout.customer.created', user_id: current_user.id, stripe_customer_id: customer.id)
    persist_customer_reference!(checkout_attempt, customer.id)
  end

  def persist_customer_reference!(checkout_attempt, customer_id)
    current_user.with_lock do
      current_user.reload
      canonical_id = current_user.stripe_customer_id.presence || customer_id
      current_user.update!(stripe_customer_id: canonical_id) if current_user.stripe_customer_id.blank?
      checkout_attempt.update!(stripe_customer_id: canonical_id)
      canonical_id
    end
  end

  def customer_idempotency_key_for_current_user
    return current_user.stripe_customer_idempotency_key if current_user.stripe_customer_idempotency_key.present?

    current_user.update!(stripe_customer_idempotency_key: SecureRandom.uuid)
    current_user.reload.stripe_customer_idempotency_key
  end

  def persist_checkout_session!(checkout_attempt, session)
    expires_at = session.respond_to?(:expires_at) && session.expires_at.present? ? Time.zone.at(session.expires_at) : nil

    # 同期Stripeレスポンスだけでは完了扱いにしない。completedはWebhook専用遷移。
    checkout_attempt.persist_open_session!(
      stripe_session_id: session.id,
      expires_at: expires_at
    )
  end

  def mark_attempt!(checkout_attempt, status, event:, error:)
    checkout_attempt&.transition_after_error!(status)
    PaymentsObservability.increment("checkout.error.#{status}", user_id: current_user.id)
    log_attempt(
      checkout_attempt,
      event,
      level: :error,
      stripe_request_id: error.respond_to?(:request_id) ? error.request_id : nil,
      error_class: error.class.name
    )
  end

  def log_attempt(checkout_attempt, event, level: :info, **attributes)
    PaymentsObservability.log(
      **{
        event: event,
        level: level,
        user_id: current_user.id,
        checkout_attempt_id: checkout_attempt&.id,
        attempt_status: checkout_attempt&.status
      }.merge(attributes.compact)
    )
  end

  def stripe_request_id_from(resource)
    response = resource.respond_to?(:last_response) ? resource.last_response : nil
    response.respond_to?(:request_id) ? response.request_id : nil
  end

  def extract_session_user_id(session)
    metadata_user_id =
      if session.respond_to?(:metadata)
        session.metadata.respond_to?(:[]) ? session.metadata['user_id'] : nil
      end

    client_reference_id = session.respond_to?(:client_reference_id) ? session.client_reference_id : nil

    metadata_user_id.presence || client_reference_id
  end
end
