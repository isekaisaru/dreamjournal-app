# Release Checklist (Payments)

支払い機能（寄付・premium サブスクリプション・Billing Portal）を本番リリースする前のチェック項目です。仕様の詳細は [payment-flow.md](payment-flow.md)、障害対応は [runbook-payments.md](runbook-payments.md) を参照。環境変数は値を表示・記録せず、present / blank と mode の一致だけを確認する。

## Environment

1. `STRIPE_SECRET_KEY` が本番キーになっている。
2. `STRIPE_MODE=live` でSecret/Publishable Keyのmode検証が成功する。
3. `STRIPE_WEBHOOK_SECRET` が本番 endpoint と一致し、受信Eventの`livemode`検証が成功する。
4. `FRONTEND_URL` が絶対 URL で設定されている（Checkout の success/cancel と Billing Portal の `return_url` に使う）。
5. `INTERNAL_API_URL` / `NEXT_PUBLIC_API_URL` が正しい。
6. `STRIPE_PREMIUM_PRICE_ID` が設定され、その Price の `livemode` が `STRIPE_MODE` と一致する（`checkout_controller.rb:226-236`）。
7. Stripe Dashboard（対象 mode）で Billing Portal の設定が保存済み（Stripe 側の設定。アプリのコードでは検証していない）。
8. 本番 Webhook endpoint に `checkout.session.completed` / `invoice.payment_succeeded` / `customer.subscription.deleted` が登録されている（`webhooks_controller.rb:81-100` が処理するイベント）。

## Application

### 寄付

1. `POST /checkout` が認証必須であることを確認。
2. `POST /checkout` がメール確認必須（未確認は 403 `email_verification_required: true`）であることを確認（`checkout_controller.rb:10`）。
3. Checkout Session に `client_reference_id` と `metadata.user_id` が含まれる。
4. `stripe_customer_id` の作成・保存・再利用が動作する。
5. Webhook で `checkout.session.completed` 受信時に `payments` が保存される（`status` は Stripe の `payment_status`）。
6. user 未解決時に `payments` と処理済み行を作成せず、再送可能な `5xx` で返す。
7. 重複 `stripe_event_id` を二重処理しない。

### premium サブスクリプション

1. `plan=premium` の Checkout が `mode=subscription` で作成され、premium 会員の再 Checkout は 422 になる。
2. `checkout.session.completed`（subscription）で `subscriptions` 行が作成され、`users.premium` が true になる。
3. `customer.subscription.deleted` で、他に有効な subscription がなければ `premium` が false に戻る。
4. 同期の Checkout 応答だけでは `premium` を付与しない（Webhook でのみ付与）。

### CheckoutAttempt

1. 同一ユーザー・同一 plan で recoverable（`pending` / `open` / `uncertain`）な Attempt が最大1件に保たれる（部分一意 index: `structure.sql:878`）。
2. 保存済み Session が未完了なら同じ URL を返し、2件目の Session を作らない。
3. timeout / 接続エラー / rate limit / Stripe API エラーで Attempt が `uncertain` になり、再 POST で同じ `idempotency_key` が使われる。
4. Attempt の `completed` 遷移は Webhook でのみ起きる。
5. migration と `structure.sql` の `checkout_attempts` が対象環境に適用済み。

### Billing Portal

1. premium 会員で `POST /billing_portal` が Portal URL を返す。
2. 非 premium は 403、`stripe_customer_id` なしは 422、`FRONTEND_URL` 未設定は 500。
3. Portal から戻ると `${FRONTEND_URL}/subscription` に遷移する。

## Test

1. `bundle exec rspec spec/requests/checkout_spec.rb` が成功する。
2. `bundle exec rspec spec/requests/webhooks_spec.rb` が成功する。
3. `bundle exec rspec spec/requests/billing_portal_spec.rb` が成功する。
4. `bundle exec rspec spec/models/checkout_attempt_spec.rb spec/services/stripe_webhook_event_processor_spec.rb` が成功する。
5. `yarn test __tests__/app/api/checkout/backend-url.test.ts`（frontend）が成功する。
6. 主要失敗ケース（署名不一致、invalid JSON、重複イベント、Attempt の `uncertain`）を確認済み。

## Observability

1. `[Payments]` ログが出力される。
2. `[PaymentsKPI]` ログが出力される。
3. 次のカウンターが観測できる:
   `checkout.request.total`, `checkout.session.created`, `webhook.event.received`, `webhook.payment.saved`, `webhook.subscription.started`
4. `checkout.attempt.*` は `[Payments]` ログ（カウンターではない）として観測できる。
5. Billing Portal はカウンターを持たず、`[BillingPortal]` ログのみ。

## E2E Smoke

1. ログインユーザーで「500円で応援する」から Stripe Checkout へ遷移できる。
2. テスト決済後に `/donation/success` へ戻る。
3. `payments` テーブルに対象レコードが保存される。
4. `processed_webhook_events` に event が記録される。
5. premium は test-mode の通しQA（[runbook-payments.md](runbook-payments.md) の「Stripe test-mode 通しQA」）で、`Checkout → Webhook 200 → CheckoutAttempt completed → premium=true → Billing Portal` を確認する。本番で premium 購入を試さない。
