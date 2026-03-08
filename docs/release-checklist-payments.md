# Release Checklist (Payments)

支払い機能を本番リリースする前のチェック項目です。

## Environment

1. `STRIPE_SECRET_KEY` が本番キーになっている。
2. `STRIPE_WEBHOOK_SECRET` が本番 endpoint と一致している。
3. `FRONTEND_URL` が絶対 URL で設定されている。
4. `INTERNAL_API_URL` / `NEXT_PUBLIC_API_URL` が正しい。

## Application

1. `POST /checkout` が認証必須であることを確認。
2. Checkout Session に `client_reference_id` と `metadata.user_id` が含まれる。
3. `stripe_customer_id` の作成・保存・再利用が動作する。
4. Webhook で `checkout.session.completed` 受信時に `payments` が保存される。
5. user 未解決時に `payments` を作成せず `200` で返す。
6. 重複 `stripe_event_id` を二重処理しない。

## Test

1. `bundle exec rspec spec/requests/checkout_spec.rb` が成功する。
2. `bundle exec rspec spec/requests/webhooks_spec.rb` が成功する。
3. 主要失敗ケース（署名不一致、invalid JSON、重複イベント）を確認済み。

## Observability

1. `[Payments]` ログが出力される。
2. `[PaymentsKPI]` ログが出力される。
3. 次のカウンターが観測できる:
   `checkout.request.total`, `checkout.session.created`, `webhook.event.received`, `webhook.payment.saved`

## E2E Smoke

1. ログインユーザーで「500円で応援する」から Stripe Checkout へ遷移できる。
2. テスト決済後に `/donation/success` へ戻る。
3. `payments` テーブルに対象レコードが保存される。
4. `processed_webhook_events` に event が記録される。
