# アカウント削除前に、ユーザーの active な Stripe サブスクを即時解約するサービス。
# DB更新は行わない（Subscription を query するのみ）。
# 解約に失敗した場合は CancellationError を raise し、呼び出し元が削除を中断できるようにする。
class SubscriptionCanceler
  class CancellationError < StandardError; end

  def initialize(user)
    @user = user
  end

  def call
    @user.subscriptions.where(status: Subscription::ACTIVE_STATUSES).find_each do |sub|
      cancel_one(sub)
    end
  end

  private

  def cancel_one(sub)
    Stripe::Subscription.cancel(sub.stripe_subscription_id)
  rescue Stripe::InvalidRequestError => e
    # 「対象が既に存在しない」= 課金停止済みとみなして冪等に成功扱い。
    # それ以外（IDが不正・想定外のリクエストエラー等）は失敗扱い。
    if e.respond_to?(:code) && e.code == 'resource_missing'
      Rails.logger.info("[AccountDeletion] 解約スキップ（既に不在）sub=#{sub.stripe_subscription_id}: #{e.message}")
      return
    end

    raise CancellationError, e.message
  rescue Stripe::StripeError => e
    # ネットワーク障害・認証エラー・レート制限など → 中断
    raise CancellationError, e.message
  end
end
