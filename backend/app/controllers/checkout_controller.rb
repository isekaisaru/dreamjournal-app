class CheckoutController < ApplicationController
  def create
    PaymentsObservability.increment('checkout.request.total', user_id: current_user.id)
    PaymentsObservability.log(event: 'checkout.request.received', user_id: current_user.id)

    begin
      # FRONTEND_URL must be absolute URL for Stripe redirect
      frontend_url = ENV['FRONTEND_URL']
      if frontend_url.blank?
        PaymentsObservability.increment('checkout.error.frontend_url_missing')
        PaymentsObservability.log(event: 'checkout.error.frontend_url_missing', level: :error, user_id: current_user.id)
        Rails.logger.error "FRONTEND_URL is not set. Cannot create Stripe session."
        return render json: { error: 'FRONTEND_URLが設定されていません。' }, status: :internal_server_error
      end

      customer_id = ensure_stripe_customer_id!

      session = if params[:plan] == 'premium'
        create_subscription_session(customer_id, frontend_url)
      else
        create_donation_session(customer_id, frontend_url)
      end

      PaymentsObservability.increment('checkout.session.created', user_id: current_user.id)
      PaymentsObservability.log(
        event: 'checkout.session.created',
        user_id: current_user.id,
        stripe_customer_id: customer_id,
        stripe_session_id: session.id,
        plan: params[:plan].presence || 'donation'
      )

      render json: { url: session.url }, status: :ok

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

  private

  def create_donation_session(customer_id, frontend_url)
    Stripe::Checkout::Session.create(
      customer: customer_id,
      client_reference_id: current_user.id.to_s,
      metadata: { user_id: current_user.id.to_s },
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          unit_amount: 500,
          product_data: {
            name: 'ユメログへの応援寄付',
            description: 'あなたの夢日記アプリ開発を応援してくれてありがとう！',
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: "#{frontend_url}/donation/success",
      cancel_url:  "#{frontend_url}/donation/cancel",
    )
  end

  def create_subscription_session(customer_id, frontend_url)
    price_id = ENV['STRIPE_PREMIUM_PRICE_ID']
    if price_id.blank?
      raise ArgumentError, 'STRIPE_PREMIUM_PRICE_ID が設定されていません。'
    end

    Stripe::Checkout::Session.create(
      customer: customer_id,
      client_reference_id: current_user.id.to_s,
      metadata: { user_id: current_user.id.to_s },
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'subscription',
      success_url: "#{frontend_url}/subscription/success",
      cancel_url:  "#{frontend_url}/subscription/cancel",
    )
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
end
