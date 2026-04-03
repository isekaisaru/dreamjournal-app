class BillingPortalController < ApplicationController
  def create
    unless current_user.stripe_customer_id.present?
      return render json: { error: 'Stripe顧客情報が見つかりません。サポートにお問い合わせください。' }, status: :unprocessable_content
    end

    frontend_url = ENV['FRONTEND_URL']
    if frontend_url.blank?
      Rails.logger.error '[BillingPortal] FRONTEND_URL is not set'
      return render json: { error: '設定エラーが発生しました。' }, status: :internal_server_error
    end

    session = Stripe::BillingPortal::Session.create(
      customer: current_user.stripe_customer_id,
      return_url: "#{frontend_url}/subscription"
    )

    render json: { url: session.url }, status: :ok
  rescue Stripe::StripeError => e
    Rails.logger.error "[BillingPortal] Stripe error for user #{current_user.id}: #{e.message}"
    render json: { error: 'サブスクリプション管理ページの準備に失敗しました。' }, status: :internal_server_error
  end
end
