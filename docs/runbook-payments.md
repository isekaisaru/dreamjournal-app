# Payments/Webhook Troubleshooting Runbook

この runbook は寄付決済フロー（Checkout + Stripe Webhook）の一次切り分け手順を定義します。

## 対象範囲

- `POST /checkout`
- `POST /webhooks/stripe`
- `payments` / `processed_webhook_events` 永続化
- KPI ログ（`[PaymentsKPI]`）

## まず確認すること

1. フロントから `POST /api/checkout` が `200` を返しているか。
2. バックエンド `POST /checkout` が `200` を返しているか。
3. Stripe Dashboard で該当イベント（`checkout.session.completed`）が配送成功か。
4. バックエンドログに `[Payments]` / `[PaymentsKPI]` が出ているか。

## よくある症状と切り分け

### 1) `POST /api/checkout` が 401

- 原因: ログイン Cookie 未送信/期限切れ。
- 対応:
1. ブラウザで再ログイン。
2. Network タブで `Cookie` が付与されているか確認。
3. バックエンドログで認証エラー有無を確認。

### 2) `POST /api/checkout` が 502 / 504

- 原因: Next.js -> Rails 間の疎通失敗またはタイムアウト。
- 対応:
1. `INTERNAL_API_URL` / `NEXT_PUBLIC_API_URL` の値を確認。
2. バックエンド `health` エンドポイントが生きているか確認。
3. Render コールドスタート中なら再試行。

### 3) `Stripe決済の準備に失敗しました`（500）

- 原因候補:
1. `FRONTEND_URL` 未設定。
2. `STRIPE_SECRET_KEY` 無効。
3. `STRIPE_MODE` とSecret KeyまたはPriceの`livemode`が不一致。
4. Stripe API 側障害。
- 対応:
1. 環境変数を確認。
2. `checkout.error.*` KPI を確認。
3. Stripe Dashboard の API ログを確認。

### 4) 決済成功したのに Payment が保存されない

- 原因候補:
1. Webhook 署名検証失敗。
2. user 解決失敗（`client_reference_id` / `stripe_customer_id` / email 不一致）。
3. 重複イベント扱い。
- 対応:
1. `STRIPE_WEBHOOK_SECRET` が一致しているか確認。
2. ログで `webhook.payment.unmatched_user` を確認。
3. `processed_webhook_events` に該当 `stripe_event_id` が存在するか確認。
4. user または Subscription を解決できない間は 5xx を返し、処理済み行を作らない。対応データを復旧した後、Stripe の再送が 200 になることを確認。

## Subscription / Billing Portal（2026年8月11日追加）

対象範囲: `POST /checkout`（`plan=premium`）/ `POST /billing_portal`（`billing_portal_controller.rb`）/ `POST /webhooks/stripe`（`checkout.session.completed` mode=subscription・`invoice.payment_succeeded`・`customer.subscription.deleted`）。

### 5) サブスク決済後も `user.premium` が true にならない

- 原因候補:
1. `checkout.session.completed` Webhookが届いていない、または署名検証で弾かれている。
2. `sync_subscription!`内でuser解決に失敗している（`client_reference_id`不一致等）。
3. 同一`stripe_subscription_id`への複数イベントが競合し、片方が5xxで終わっている（[PR #490](https://github.com/isekaisaru/dreamjournal-app/pull/490)で`requires_new`savepointによる再試行を追加済み）。
- 対応:
1. ログで `webhook.subscription.started` / `webhook.subscription.invoice_paid` の有無を確認。
2. `Subscription`テーブルで該当`stripe_subscription_id`の行と`status`を確認。
3. `webhook.error.processing` が出ていないか確認（出ていればイベント種別と`stripe_event_id`を控える）。

### 6) 顧客ポータル(`POST /billing_portal`)が開けない

- 原因候補:
1. `current_user.premium?`がfalse（403 `プレミアム会員のみご利用いただけます。`）。
2. `current_user.stripe_customer_id`が未設定（422 `Stripe顧客情報が見つかりません。`）。
3. `FRONTEND_URL`未設定（500）。
4. Stripe API側エラー（500、`Stripe::StripeError`）。
- 対応:
1. レスポンスのエラーメッセージでどの分岐かを特定する（`billing_portal_controller.rb`参照）。
2. `Rails.logger`の`[BillingPortal]`プレフィックスでエラー詳細を確認（このコントローラはKPIカウンターを持たず、ログのみ）。
3. `stripe_customer_id`が未設定の場合、`checkout`が一度も成功していない可能性が高いため症状3)・4)から遡って確認する。

### 7) 解約(`customer.subscription.deleted`)後もpremiumが戻らない

- 原因候補:
1. 該当ユーザーに他のactive/past_due状態のSubscriptionが残っている（`User#premium_active_subscription?`が true のまま）。これは仕様どおり（複数サブスクの一部解約では降格しない）。
2. Webhookが届いていない、またはuser解決に失敗している。
- 対応:
1. `Subscription.where(user: user).pluck(:stripe_subscription_id, :status)`で全件のstatusを確認する。
2. 意図せず複数Subscription行が残っている場合は、Stripeダッシュボード側の実際の契約状態と突き合わせる。

## KPI / ログの見方

- 構造化ログ:
1. `[Payments] event=...`
2. `[PaymentsKPI] counter=... value=1 ...`

- 主要カウンター:
1. `checkout.request.total`
2. `checkout.customer.created`
3. `checkout.customer.reused`
4. `checkout.session.created`
5. `webhook.event.received`
6. `webhook.payment.saved`
7. `webhook.payment.unmatched_user`
8. `webhook.event.duplicate`
9. `webhook.error.processing`
10. `webhook.error.stripe_mode_mismatch`

## Webhook 再送と処理確定

1. 業務更新と `processed_webhook_events` の作成は同一DBトランザクションで確定する。
2. `processed_webhook_events` に行がなければ、受信済みでも処理完了とは限らない。
3. 5xx のイベントはStripeからの再送対象。UserやSubscriptionの照合状態を直した後、再送成功とDB状態を確認する。
4. 同じ `stripe_event_id` の200再送は正常な重複排除であり、業務更新は再実行されない。

## 手動検証コマンド（開発環境）

```bash
stripe listen --forward-to localhost:3001/webhooks/stripe
stripe trigger checkout.session.completed
```

## エスカレーション条件

以下に該当したらアプリ側だけで解決しないため、即エスカレーション:

1. Stripe Dashboard で 5xx が連続。
2. 同一ユーザーで `checkout.customer.created` が異常に多い。
3. `webhook.error.processing` が継続的に発生。
