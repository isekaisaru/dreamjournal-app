class CheckoutController < ApplicationController
  class MissingPremiumPriceIdError < StandardError; end

  DONATION_UNIT_AMOUNT = 500

  def create
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

      customer_id = ensure_stripe_customer_id!

      session = Stripe::Checkout::Session.create(
        build_checkout_session_params(
          plan: plan,
          frontend_url: frontend_url,
          customer_id: customer_id
        )
      )

      PaymentsObservability.increment('checkout.session.created', user_id: current_user.id)
      PaymentsObservability.log(
        event: 'checkout.session.created',
        user_id: current_user.id,
        stripe_customer_id: customer_id,
        stripe_session_id: session.id,
        plan: params[:plan].presence || 'donation'
      )

      render json: { url: session.url }, status: :ok
    rescue MissingPremiumPriceIdError => e
      PaymentsObservability.increment('checkout.error.premium_price_missing', user_id: current_user.id)
      PaymentsObservability.log(event: 'checkout.error.premium_price_missing', level: :error, user_id: current_user.id)
      Rails.logger.error "Checkout configuration error: #{e.message}"
      render json: { error: 'プレミアム決済の設定が未完了です。' }, status: :internal_server_error
    rescue Stripe::StripeError => e
      PaymentsObservability.increment('checkout.error.stripe', user_id: current_user.id)
      PaymentsObservability.log(event: 'checkout.error.stripe', level: :error, user_id: current_user.id, message: e.message)
      Rails.logger.error "Stripe error: #{e.message}"
      render json: { error: 'Stripe決済の準備に失敗しました。' }, status: :internal_server_error
    rescue => e
      PaymentsObservability.increment('checkout.error.unexpected', user_id: current_user.id)
      PaymentsObservability.log(event: 'checkout.error.unexpected', level: :error, user_id: current_user.id, message: e.message)
      Rails.logger.error "Checkout error: #{e.message}"
      render json: { error: '予期しないエラーが発生しました。' }, status: :internal_server_error
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
    PaymentsObservability.log(event: 'checkout.session_lookup.invalid', level: :warn, user_id: current_user.id, stripe_session_id: session_id, message: e.message)
    render json: { error: '決済セッションが見つかりません。' }, status: :not_found
  rescue Stripe::StripeError => e
    PaymentsObservability.increment('checkout.session_lookup.error', user_id: current_user.id)
    PaymentsObservability.log(event: 'checkout.session_lookup.error', level: :error, user_id: current_user.id, stripe_session_id: session_id, message: e.message)
    render json: { error: '決済確認に失敗しました。' }, status: :bad_gateway
  end

  private

  def requested_plan
    params[:plan].to_s == 'premium' ? 'premium' : 'donation'
  end

  def build_checkout_session_params(plan:, frontend_url:, customer_id:)
    base_params = {
      customer: customer_id,
      client_reference_id: current_user.id.to_s,
      metadata: {
        user_id: current_user.id.to_s,
        plan: plan
      },
      payment_method_types: ['card']
    }

    plan == 'premium' ? base_params.merge(premium_session_params(frontend_url)) : base_params.merge(donation_session_params(frontend_url))
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

  def premium_session_params(frontend_url)
    price_id = ENV['STRIPE_PREMIUM_PRICE_ID']
    raise MissingPremiumPriceIdError, 'STRIPE_PREMIUM_PRICE_ID is not set' if price_id.blank?

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

  def ensure_stripe_customer_id!
    existing_id = current_user.stripe_customer_id

    if existing_id.present?
      customer = Stripe::Customer.retrieve(existing_id)

      # Stripeで削除済みの顧客を再利用しないようにチェック
      # 削除済み顧客でCheckout Sessionを作ると500エラーになるため
      unless customer.respond_to?(:deleted) && customer.deleted
        PaymentsObservability.increment('checkout.customer.reused', user_id: current_user.id)
        PaymentsObservability.log(event: 'checkout.customer.reused', user_id: current_user.id, stripe_customer_id: existing_id)
        return existing_id
      end

      # 削除済みだった場合は新規作成へフォールスルー
      PaymentsObservability.increment('checkout.customer.deleted', user_id: current_user.id)
      PaymentsObservability.log(event: 'checkout.customer.deleted', level: :warn, user_id: current_user.id, stripe_customer_id: existing_id)
    end

    create_and_save_stripe_customer!
  rescue Stripe::InvalidRequestError => e
    # IDが無効（存在しない等）の場合も新規作成
    PaymentsObservability.increment('checkout.customer.invalid_reference', user_id: current_user.id)
    PaymentsObservability.log(
      event: 'checkout.customer.invalid_reference',
      level: :warn,
      user_id: current_user.id,
      stripe_customer_id: existing_id,
      message: e.message
    )
    create_and_save_stripe_customer!
  end

  def create_and_save_stripe_customer!
    customer = Stripe::Customer.create(
      email: current_user.email,
      name: current_user.username,
      metadata: { user_id: current_user.id.to_s }
    )
    current_user.update!(stripe_customer_id: customer.id)
    PaymentsObservability.increment('checkout.customer.created', user_id: current_user.id)
    PaymentsObservability.log(event: 'checkout.customer.created', user_id: current_user.id, stripe_customer_id: customer.id)
    customer.id
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
