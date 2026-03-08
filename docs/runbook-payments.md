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
3. Stripe API 側障害。
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
