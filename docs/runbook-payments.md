# Payments/Webhook Troubleshooting Runbook

この runbook は寄付決済フロー（Checkout + Stripe Webhook）の一次切り分け手順を定義します。

## 対象範囲

- `POST /checkout`
- `POST /webhooks/stripe`
- `payments` / `processed_webhook_events` 永続化
- KPI ログ（`[PaymentsKPI]`）


## Stripe環境モードと起動ガード（2026-09-10）

`StripeEnvironmentGuard` は、`STRIPE_MODE` が未設定なら Rails の環境名から mode を補完する。production では未設定を **live** と扱う。

- production Rails で Stripe test-mode を使う限定QAでは、`STRIPE_MODE=test` を明示する。
- test-modeでは、Secret Key / Publishable Key / Price / Webhook Event がすべてtest modeであることを、値そのものを記録せず接頭辞またはStripeの`livemode=false`で確認する。
- production Rails + mode未設定 + test key は起動時に不一致として停止する。これは誤ってtest/liveを混在させない安全ガードであり、無効化しない。
- 起動失敗時はCheckoutを試さず、mode・key種別・Price・Webhook Eventの境界をread-onlyで確認する。環境変数を変更する判断は人間が別途行う。

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

### 3) Checkout が開けない（`POST /checkout` が 4xx / 5xx）

メール未確認以外の分岐は画面の文言では判別できない。寄付ページ・サブスクページは、403 かつ本文に `email_verification_required: true` を含む場合だけメール確認の案内バナー（確認メールの再送ボタン付き）を出し（`frontend/app/donation/page.tsx:22-30`、`frontend/app/subscription/page.tsx:74-82`）、それ以外の失敗は一律「決済ページの準備に失敗しました。」（`frontend/app/donation/page.tsx:32-34`、`frontend/app/subscription/page.tsx:84-86`）、`DonationButton` は「決済の準備に失敗しました」（`frontend/app/components/DonationButton.tsx:28-30`）を出す。旧版にあった「Stripe決済の準備に失敗しました」という文言はコードに存在しない。Network タブで `/api/checkout` の **HTTP status とレスポンス本文の `error`** を確認し、下表で分岐を特定する（根拠は `backend/app/controllers/checkout_controller.rb`）。

| status | `error`（本文） | 原因 | Attempt | 根拠 |
| --- | --- | --- | --- | --- |
| 403 | `メールアドレスの確認が必要です。…`（`email_verification_required: true`） | メール未確認 | 作らない | `application_controller.rb:96-104` |
| 403 | `不正なリクエスト元からの操作は許可されていません。` | Origin/Referer 不一致 | 作らない | `application_controller.rb:20-32` |
| 500 | `FRONTEND_URLが設定されていません。` | `FRONTEND_URL` 未設定 | 作らない | `:24-30` |
| 500 | `プレミアム決済の設定が未完了です。` | `STRIPE_PREMIUM_PRICE_ID` 未設定 | 作らない | `:104-108` |
| 500 | `プレミアム決済の設定が一致していません。` | `STRIPE_MODE` と Price の `livemode` 不一致 | 作らない | `:109-113` |
| 500 | `予期しないエラーが発生しました。` | 想定外の例外 | 状態は変えない | `:137-141` |
| 504 | `Stripeとの通信がタイムアウトしました。…` | Rails→Stripe の timeout | `uncertain` | `:114-116` |
| 503 | `Stripeへ一時的に接続できません。…` | `Stripe::APIConnectionError` | `uncertain` | `:117-119` |
| 503 | `Stripeで一時的な問題が発生しました。…` | `Stripe::APIError` | `uncertain` | `:123-125` |
| 503 | `Stripe決済の状態を確認できませんでした。…` | 未分類の `Stripe::StripeError`（Secret Key 無効などもここに入りうる **（推測）**） | `uncertain` | `:132-136` |
| 429 | `決済サービスが混み合っています。…` | `Stripe::RateLimitError` | `uncertain` | `:120-122` |
| 409 | `この決済はすでに完了しています。反映をお待ちください。` | 保存済み Session が Stripe 上で `complete`、Webhook 未着 | `open` のまま | `:61-66`, `:100-101` |
| 409 | `以前の決済処理を確認中です。…` | 既存 Attempt と `price_reference` 不一致（Price 変更など） | 変えない | `:40-42`, `:102-103` |
| 409 | `同じ決済処理を確認中です。…` | `Stripe::IdempotencyError` | `uncertain` | `:126-128` |
| 422 | `すでにプレミアム会員です。` | premium 会員が再度 premium Checkout | 作らない | `:32-34` |
| 422 | `決済情報を確認できませんでした。` | `Stripe::InvalidRequestError` | `failed` | `:129-131` |

- Next.js の中継自体が返す status もある: `BACKEND_URL_NOT_SET`（500）、15秒タイムアウト（504、本文 `Checkout request timed out after 15s`）、upstream 到達不可（502 `UPSTREAM_FETCH_FAILED`）（`frontend/app/api/checkout/route.ts:10-12`, `:39-46`）。Rails 側の 504 とは本文で区別する。Next.js の 504 は Rails の処理結果が不明な状態である。
- `uncertain` / 409 / 504 / 503 / 429 は Stripe 側で Session が作られた可能性がある。**再POST・再クリックを重ねず**、`[Payments] event=checkout.attempt.*` ログと該当ユーザーの `checkout_attempts`（status・`stripe_checkout_session_id`）を read-only で確認する。
- 対応:
1. 上表で分岐を特定し、該当する環境変数（値ではなく present / blank）を確認。
2. `checkout.error.*` カウンター（`frontend_url_missing` / `premium_price_missing` / `stripe_mode_mismatch` / `uncertain` / `failed` / `stripe` / `unexpected`）を確認（`checkout_controller.rb:26`, `:105`, `:110`, `:135`, `:138`, `:367`）。
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
11. `webhook.subscription.started`（premium の `checkout.session.completed`。`webhooks_controller.rb:159`）
12. `webhook.subscription.invoice_paid`（`invoice.payment_succeeded`。同 `:181`）
13. `webhook.subscription.deleted`（`customer.subscription.deleted`。同 `:197`）
14. `webhook.subscription.unmatched_user`（premium Checkout の user 解決失敗。同 `:143`, `:347`）

- カウンターとログの区別:
1. カウンターは `PaymentsObservability.increment` が出す `[PaymentsKPI] counter=...` 行（`backend/app/services/payments_observability.rb:11-20`）。
2. `checkout.attempt.*`（`open` / `reused` / `expired` / `awaiting_webhook` / `invalid_session` / `timeout` / `connection_error` / `rate_limited` / `api_error` / `idempotency_error` / `invalid_request` / `stripe_error` / `finished` / `completed` / `not_found`）は **`[Payments] event=...` のログであってカウンターではない**（`PaymentsObservability.log` 経由: `checkout_controller.rb:377-387`、`webhooks_controller.rb:313-326`）。`[PaymentsKPI]` 行を検索しても出てこない。
3. Attempt 系エラーのカウンターは `checkout.error.uncertain` / `checkout.error.failed`（`checkout_controller.rb:367`）。

## Webhook 再送と処理確定

1. 業務更新と `processed_webhook_events` の作成は同一DBトランザクションで確定する。
2. `processed_webhook_events` に行がなければ、受信済みでも処理完了とは限らない。
3. 5xx のイベントはStripeからの再送対象。UserやSubscriptionの照合状態を直した後、再送成功とDB状態を確認する。
4. 同じ `stripe_event_id` の200再送は正常な重複排除であり、業務更新は再実行されない。


## PR #504後: Stripe test-mode 通しQA（人間が1回だけ実施）

目的は、test-modeで `Checkout → Webhook 200 → CheckoutAttempt completed → premium=true → Billing Portal` を1回だけ確認すること。これは本番購入の手順ではない。

### QA前のread-only確認

すべて満たすまでCheckoutを作成しない。

1. 対象main SHAとRenderの稼働releaseを照合し、PR #504を含むことを確認する。
2. Rails configurationのStripe modeが`test`であること、キー種別がtestであることを確認する。値・署名secretは表示・記録しない。production Railsでmodeを省略してはいけない。
3. premium用Priceがtest mode（`livemode=false`）であることを確認する。Price IDの文字列だけでは判定しない。
4. QA対象ユーザー、接続DB、実行環境の境界を人間が承認する。DB境界が不明ならSTOPする。
5. QA対象ユーザーの`CheckoutAttempt`をread-onlyで確認し、`pending` / `open` / `uncertain` がないこと、保存済みSessionを再利用すべきAttemptがないことを確認する。
6. Webhook endpointがtest-mode用に準備済みで、署名secretが設定済みであることを値を表示せず確認する。migration/schemaの適用状態もread-onlyで一致を確認する。

### 実行

1. QA対象ユーザーでpremium Checkoutを開始する。**新しいCheckoutは最大1回**とする。
2. Checkout画面へ遷移できたら、test cardで完了する。決済操作後は追加のCheckoutを作らない。
3. timeout、通信エラー、画面遷移失敗、またはRailsの結果不明が起きたら、再POST・再クリック・新規Checkoutをしない。下の証拠確認へ移る。
4. saved Sessionを持つactive Attemptが見つかった場合は、そのSessionのread-only確認を優先する。`uncertain`は成功/失敗を断定しない。

### 実行後の証拠（値はID・種別・状態だけを記録）

次を1件のQA記録として残す。secret、token、署名値、カード情報は記録しない。

- main SHA / Render release識別子
- QAユーザー識別子（必要最小限）
- CheckoutAttempt ID と最終status
- Stripe Session ID
- `checkout.session.completed` のWebhook event type とHTTP status（期待: 200）
- `premium` の最終値（期待: true）
- Billing Portal遷移の成否（期待: URLを取得して表示できる）

Webhookでsubscription処理とAttempt完了が確定する。同期Checkout応答だけで`completed`や`premium=true`と判断しない。

### STOP条件

次のいずれかなら、その場でSTOPし、新しいCheckoutを作らない。

- Stripe test/live不一致、またはproduction Stripeの可能性がある。
- 接続DBまたはQA対象ユーザーの境界が不明。
- `pending` / `open` / `uncertain` のAttempt、または再利用すべき保存済みSessionがある。
- Stripe側では成功した可能性があるが、Railsの結果が不明（timeout・接続エラー・`uncertain`）。
- Webhook署名検証失敗、Webhookが200以外、またはeventの`livemode`不一致。
- migration/schemaの不一致、または起動ガードのConfigurationError。

STOP後は、Renderログ、Stripe Dashboard、対象Attempt、Webhook配送結果をread-onlyで照合し、人間が次の操作を判断する。

## 手動検証コマンド（開発環境）

```bash
stripe listen --forward-to localhost:3001/webhooks/stripe
stripe trigger checkout.session.completed
```

**注意: 上の「Stripe test-mode 通しQA」の実施中は `stripe trigger checkout.session.completed` を使わない。**

- `stripe trigger` が送るイベントのセッションは、アプリの `POST /checkout` で作ったものではないため `client_reference_id` を持たず、アプリのユーザーの `stripe_customer_id` / email とも一致しない見込み **（推測：Stripe CLI の fixture の内容はこのリポジトリでは確認していない）**。その場合 user を解決できず 500 になり、Stripe からの再送対象になる（`webhooks_controller.rb:116-121`, `:68-70`, `:286-298`）。
- Stripe test-mode 上に QA 対象外の Checkout Session / イベントが増え、QA 記録との照合を難しくする **（推測）**。
- QA の Webhook 確認は、実際の Checkout 完了で届いた `checkout.session.completed` だけで行う。`stripe trigger` は QA と切り離したローカル開発での配線確認に限る。

## エスカレーション条件

以下に該当したらアプリ側だけで解決しないため、即エスカレーション:

1. Stripe Dashboard で 5xx が連続。
2. 同一ユーザーで `checkout.customer.created` が異常に多い。
3. `webhook.error.processing` が継続的に発生。
