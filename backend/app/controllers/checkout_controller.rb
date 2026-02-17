class CheckoutController < ApplicationController
  # 認証をスキップ（寄付は誰でも可能）
  skip_before_action :authorize_request, only: [:create]

  def create
    begin
      # FRONTEND_URL must be absolute URL for Stripe redirect
      frontend_url = ENV['FRONTEND_URL']
      if frontend_url.blank?
        Rails.logger.error "FRONTEND_URL is not set. Cannot create Stripe session."
        return render json: { error: 'FRONTEND_URLが設定されていません。' }, status: :internal_server_error
      end

      # Stripe Checkout Session を作成
      # これは「決済画面のURL」を生成するリクエスト
      session = Stripe::Checkout::Session.create(
        # 決済方法（カード決済）
        payment_method_types: ['card'],
        
        # 決済する商品（今回は寄付）
        line_items: [{
          price_data: {
            currency: 'jpy', # 日本円
            unit_amount: 500, # 500円（Stripeは最小単位で指定：円なら1円単位）
            product_data: {
              name: 'ユメログへの応援寄付',
              description: 'あなたの夢日記アプリ開発を応援してくれてありがとう！',
            },
          },
          quantity: 1,
        }],
        
        # 決済モード（一回きりの支払い）
        mode: 'payment',
        
        # 決済成功後のリダイレクト先（フロントエンドのURL）
        success_url: "#{frontend_url}/donation/success",
        
        # キャンセル時のリダイレクト先
        cancel_url: "#{frontend_url}/donation/cancel",
      )

      # 生成された決済画面のURLをフロントエンドに返す
      render json: { url: session.url }, status: :ok
      
    rescue Stripe::StripeError => e
      # Stripeのエラーが発生した場合
      Rails.logger.error "Stripe error: #{e.message}"
      render json: { error: 'Stripe決済の準備に失敗しました。' }, status: :internal_server_error
    rescue => e
      # それ以外のエラー
      Rails.logger.error "Checkout error: #{e.message}"
      render json: { error: '予期しないエラーが発生しました。' }, status: :internal_server_error
    end
  end
end
