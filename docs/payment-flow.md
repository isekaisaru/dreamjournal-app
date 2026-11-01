# Payment Flow Spec

このドキュメントは、寄付（donation）とプレミアム（premium サブスクリプション）の決済フローについて、**現行実装（main `7673be0d` 時点、2026-10-22確認）** の挙動を固定し、実装ブレと運用事故を防ぐための基準です。

- 記述はコードに準拠する（AGENTS.md「実装準拠」）。根拠は `file:line` で示す。
- コードから読み取った事実と、Stripe 側の仕様・推測は区別して書く。推測には **（推測）** を付ける。
- 障害時の一次切り分けは [runbook-payments.md](runbook-payments.md) を優先する。

## Scope

- `POST /checkout`（Checkout Session 作成。寄付 / premium）
- `GET /checkout/session`（premium 完了画面のセッション確認）
- `POST /billing_portal`（Stripe Billing Portal）
- `POST /webhooks/stripe`（Stripe Webhook 受信）
- `payments` / `subscriptions` / `checkout_attempts` / `processed_webhook_events` の保存ルール

ルート定義: `backend/config/routes.rb:61-64`

## 1. Authentication Rule（ログイン＋メール確認必須）

- `POST /checkout` は JWT Cookie 認証必須。`CheckoutController` は `ApplicationController` の `before_action :authorize_request` をスキップしていない（`backend/app/controllers/application_controller.rb:12`、未ログインは 401: 同 `:53-57`, `:69-72`）。
- 状態変更系リクエストは Origin（なければ Referer）の許可リスト検証を通る必要がある。不一致は 403（`application_controller.rb:11`, `:20-32`）。Next.js の中継は Origin/Referer を転送する（`frontend/app/api/checkout/route.ts:30-31`）。
- **メールアドレス確認必須**: `before_action :require_verified_email, only: [:create]`（`backend/app/controllers/checkout_controller.rb:10`）。未確認ユーザーには 403 と `email_verification_required: true` を返す（`application_controller.rb:96-104`）。トライアルユーザーは対象外（同 `:97`）。
- Checkout Session 作成時は `customer`・`client_reference_id`（user id）・`metadata.user_id`・`metadata.plan` を必ず付与する（`checkout_controller.rb:189-198`）。`customer_email` は使っていない。
- `POST /webhooks/stripe` だけは JWT 認証と Origin 検証をスキップし、署名検証で正当性を担保する（`backend/app/controllers/webhooks_controller.rb:8`, `:11`, `:27-30`）。

## 2. User Resolution Rule（user 不明時の扱い）

`checkout.session.completed` の user 解決順（`webhooks_controller.rb:286-298`）:

1. `client_reference_id` → `User.id`
2. `customer` → `User.stripe_customer_id`
3. `customer_details.email` または `customer_email` → `User.email`

- user を特定できない場合は保存しない。寄付は `webhook.payment.unmatched_user`、premium は `webhook.subscription.unmatched_user` を記録し（`webhooks_controller.rb:116-121`, `:140-145`, `:345-356`）、`UnresolvedWebhookDataError` で **500** を返す（同 `:68-70`）。
- 業務更新と処理済み行は同一トランザクション内なので、500 の場合は `payments` も `processed_webhook_events` も作られない（`backend/app/services/stripe_webhook_event_processor.rb:15-28`）。user 解決後の Stripe 再送で確定する。

## 3. `payments.status`（寄付のみ）

- `payments` は **寄付（`mode=payment`）の `checkout.session.completed` でだけ** 作成・更新する（`webhooks_controller.rb:85-89`, `:116-138`）。premium（`mode=subscription`）では `payments` を作らない（同 `:140-167`）。
- `payments.status` には Stripe Checkout Session の `payment_status` を**そのまま保存**する（`webhooks_controller.rb:362-377`）。アプリ側で `completed` / `refunded` / `failed` のような独自値へ変換していない。
- モデルは `status` の presence だけを検証し、値の列挙制約はない（`backend/app/models/payment.rb:8`、DB も `character varying NOT NULL`: `backend/db/structure.sql:380`）。
- Stripe の `payment_status` は `paid` / `unpaid` / `no_payment_required` のいずれか（Stripe API 仕様。アプリ側では検証していない）。
- 保存するのは `stripe_checkout_session_id` / `stripe_payment_intent_id` / `amount`（`amount_total`）/ `currency` / `status`。`amount_total` / `currency` / `payment_status` が欠けたイベントは `InvalidCheckoutSessionPayloadError` で 500（`webhooks_controller.rb:367-369`）。
- **状態遷移（返金・失敗）は未実装**。一度保存した `payments.status` を後続イベントで更新する処理はない。

## 4. Stripe Event Mapping（現行実装）

分岐: `webhooks_controller.rb:81-100`

| Stripe event | 処理 | DB操作 |
| --- | --- | --- |
| `checkout.session.completed`（`mode=payment`） | `handle_donation_checkout_completed` | `payments` を `stripe_checkout_session_id` で find_or_initialize して保存（`:116-138`） |
| `checkout.session.completed`（`mode=subscription`） | `handle_subscription_checkout_completed` | `Stripe::Subscription.retrieve` → `subscriptions` upsert → `users.premium` 再計算（`:140-167`, `:210-254`） |
| `checkout.session.completed`（共通・上記の後） | `mark_checkout_attempt_completed!` | 該当 `checkout_attempts` を `completed` に更新。見つからなければログのみ（`:90`, `:313-326`） |
| `invoice.payment_succeeded` | `handle_invoice_payment_succeeded` | `Stripe::Subscription.retrieve` → `subscriptions` upsert → `premium` 再計算（`:169-189`） |
| `customer.subscription.deleted` | `handle_subscription_deleted` | 受信 payload で `subscriptions` 更新 → `premium` 再計算（`:191-205`） |
| `charge.refunded` | **未実装**（else 分岐） | 変更なし。`webhook.event.unhandled` を記録して **200**（`:95-99`） |
| `payment_intent.payment_failed` | **未実装**（else 分岐） | 同上 |
| その他イベント | else 分岐 | 同上 |

- else 分岐のイベントも `StripeWebhookEventProcessor` のブロック内で処理されるため、`processed_webhook_events` に行が作られる（`stripe_webhook_event_processor.rb:21-25`）。
- 返金・決済失敗を `payments` に反映したい場合は新規実装が必要（このドキュメントでは仕様化しない）。

## 5. Subscription（premium）

### Checkout（`plan=premium`）

- `params[:plan] == 'premium'` のときだけ premium、それ以外は寄付（`checkout_controller.rb:185-187`）。
- すでに `current_user.premium?` なら 422 `すでにプレミアム会員です。`（`checkout_controller.rb:32-34`）。
- `STRIPE_PREMIUM_PRICE_ID` 未設定は 500 `プレミアム決済の設定が未完了です。`。Price を Stripe から取得し、`StripeEnvironmentGuard.validate_price!` で mode と `livemode` の一致を検証する（`checkout_controller.rb:226-236`, `:104-113`）。
- Session は `mode: 'subscription'`、`success_url: ${FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`、`cancel_url: ${FRONTEND_URL}/subscription/cancel`（`checkout_controller.rb:238-248`）。寄付は 500円固定・`/donation/success`・`/donation/cancel`（同 `:12`, `:207-224`）。

### Webhook での同期

- `sync_subscription!` は Stripe の subscription `status` が `Subscription::STATUSES` に含まれない場合 500（`webhooks_controller.rb:214-217`、`backend/app/models/subscription.rb:4-6`）。
- `subscriptions.stripe_subscription_id` は一意（`structure.sql:1046`）。既存行は行ロック、新規 INSERT は savepoint（`requires_new: true`）に隔離し、一意制約違反なら最大2回再試行する（`webhooks_controller.rb:259-278`）。
- user 解決は `preferred_user`（checkout時）→ 既存 `subscription.user` → `stripe_customer_id`（`webhooks_controller.rb:232-233`）。
- `users.premium` は `premium_active_subscription?`（`trialing` / `active` / `past_due` の subscription が1件でもあるか）で再計算する（`webhooks_controller.rb:246-251`、`backend/app/models/user.rb:123-125`、`subscription.rb:7`）。複数 subscription の一部が解約されても他が active なら premium は維持される。
- premium の付与は同期の Checkout 応答ではなく Webhook でのみ行う。

### 完了画面のセッション確認（`GET /checkout/session`）

- `session.mode == 'subscription'`・セッションの user（`metadata.user_id` → `client_reference_id`）が `current_user` と一致・`status == 'complete'` の場合だけ `verified: true` と `premium` を返す（`checkout_controller.rb:150-172`, `:394-403`）。DB は更新しない。

### Billing Portal（`POST /billing_portal`）

- `premium?` でなければ 403、`stripe_customer_id` がなければ 422、`FRONTEND_URL` 未設定は 500、Stripe エラーは 500（`backend/app/controllers/billing_portal_controller.rb:2-26`）。
- `return_url` は `${FRONTEND_URL}/subscription`（同 `:17-20`）。
- `require_verified_email` は付いていない（同 `:1-2`）。KPI カウンターはなく、`[BillingPortal]` ログのみ。

## 6. CheckoutAttempt（二重 Checkout 防止）

`POST /checkout` は Stripe を呼ぶ前に `checkout_attempts` 行を確保し、同一ユーザー・同一 plan で Checkout Session を重複作成しないようにする。

### 状態

`pending` / `open` / `uncertain` / `completed` / `expired` / `failed`（`backend/app/models/checkout_attempt.rb:2`、DB の CHECK 制約: `structure.sql:175`）

| status | 意味 | 遷移元（根拠） |
| --- | --- | --- |
| `pending` | Attempt 作成直後。Stripe Session 未保存 | 作成時（`checkout_controller.rb:266-274`） |
| `open` | Stripe Session ID を保存済み | `pending` / `open` / `uncertain` から（`checkout_attempt.rb:45-55`） |
| `uncertain` | Stripe 側の成否を断定できない（timeout・接続エラー・rate limit・API エラー・idempotency エラー・未分類 StripeError） | `pending` / `uncertain` から（`checkout_attempt.rb:28-35`、`checkout_controller.rb:114-136`） |
| `completed` | Webhook `checkout.session.completed` で確定 | Webhook のみ（`webhooks_controller.rb:313-326`） |
| `expired` | 保存済み Session が Stripe 上で `expired` | `checkout_controller.rb:56-60` |
| `failed` | `Stripe::InvalidRequestError`、または保存済み Session が Stripe 上に存在しない | `checkout_controller.rb:129-131`、`checkout_attempt.rb:37-42` |

- `pending` / `open` / `uncertain` が「recoverable（再利用対象）」（`checkout_attempt.rb:3`, `:8`）。
- 同期 Checkout 応答では `completed` にしない（`checkout_controller.rb:61-66`, `:355-363`）。Webhook が先に `completed` にした場合も、遅れた Controller 応答で `open` へ戻さない（`checkout_attempt.rb:44-55`）。
- エラー遷移は `pending` / `uncertain` からだけ行い、`open` や `completed` を降格させない（`checkout_attempt.rb:4`, `:27-35`）。

### 一意制約

- 部分一意 index: `(user_id, plan) WHERE status IN ('pending','open','uncertain')`（`structure.sql:878`）。同一ユーザー・同一 plan の recoverable Attempt は最大1件。
- `idempotency_key` 一意（`structure.sql:892`）、`stripe_checkout_session_id` 一意（`structure.sql:899`）。
- Attempt の取得/作成は user 行ロック内で行い、一意制約違反時は既存の recoverable Attempt を返す（`checkout_attempt.rb:15-25`）。

### `POST /checkout` の再利用判定（`checkout_controller.rb:36-99`）

1. recoverable Attempt があれば再利用、なければ `pending` で作成。
2. Attempt の `price_reference` が今回と異なれば 409（`:40-42`, `:102-103`）。
3. Attempt に Session ID があれば Stripe から取得:
   - `expired` → Attempt を `expired` にして新しい Attempt を作成（`:57-60`）
   - `complete` → `open` のまま保持し 409 `この決済はすでに完了しています。反映をお待ちください。`（`:61-66`, `:100-101`）
   - それ以外 → 保存済み Session の URL を返す（`:67-71`）
   - Session が存在しない（`InvalidRequestError`）→ Attempt を `failed` にして新しい Attempt を作成（`:47-53`）
4. Session 未保存なら Stripe Customer を確保し、`Stripe::Checkout::Session.create` を Attempt の `idempotency_key` 付きで呼ぶ（`:75-85`）。
5. 成功したら Session ID と `expires_at` を保存して `open`（`:87`, `:355-363`）。

### Idempotency key

- Checkout Session 作成: Attempt ごとの `idempotency_key`（UUID）（`checkout_controller.rb:84`, `:270`）。`uncertain` の Attempt は recoverable なので、次の `POST /checkout` で同じ key を使って `Session.create` が再実行される。
- Stripe Customer 作成: ユーザー単位の `stripe_customer_idempotency_key`（`checkout_controller.rb:321-329`, `:345-353`）。
- 同じ key で Stripe が以前と同じ結果を返すかは Stripe の idempotency key 保持期間に依存する（Stripe 公式ドキュメントでは少なくとも24時間保持。期間を過ぎた後の挙動はこのリポジトリでは検証していない **（推測）**）。

## 7. Idempotency / Duplicate Handling（Webhook）

- `processed_webhook_events.stripe_event_id` の一意制約で同一イベント再処理を防ぐ（`structure.sql:1032`）。
- `payments.stripe_checkout_session_id` の一意制約で二重作成を防ぐ（`structure.sql:1004`）。`stripe_payment_intent_id` も一意（`structure.sql:1011`）。
- 同じ `stripe_event_id` はトランザクション単位のアドバイザリロック（`pg_advisory_xact_lock`）で直列化する（`stripe_webhook_event_processor.rb:35-42`）。
- 業務更新が成功した最後にだけ `processed_webhook_events` を作成し、例外時は同じトランザクションで全更新をロールバックする（`stripe_webhook_event_processor.rb:15-28`）。

## 8. Error Handling（Webhook）

| 条件 | HTTP | 根拠 |
| --- | --- | --- |
| `STRIPE_WEBHOOK_SECRET` 未設定 | 500 | `webhooks_controller.rb:17-22` |
| 不正JSON / 署名検証失敗 | 400 | `webhooks_controller.rb:35-46` |
| Stripe mode と event の `livemode` 不一致 | 500 | `webhooks_controller.rb:47-52` |
| 処理済みイベントの再受信 | 200（スキップ） | `webhooks_controller.rb:61-67` |
| user / Subscription 未解決、payload 欠損、未対応 subscription status | 500 | `webhooks_controller.rb:68-70` |
| 処理中の Stripe API エラー（例: `Stripe::Subscription.retrieve`） | 502 | `webhooks_controller.rb:71-73` |
| その他の例外 | 500 | `webhooks_controller.rb:74-77` |

`checkout.session.completed`（premium）と `invoice.payment_succeeded` は、イベントロックとトランザクションを保持したまま `Stripe::Subscription.retrieve` を呼ぶ（`webhooks_controller.rb:152`, `:174`）。

## 9. 旧版からの変更点（2026-10-22）

旧版（2026-03-06時点の理想仕様）は次の点で現行実装と食い違っていたため、実装準拠に書き換えた。

- `payments.status` の3値（`completed` / `refunded` / `failed`）と状態遷移 → 実装は Stripe の `payment_status` をそのまま保存し、遷移処理はない。
- 列名 `payments.stripe_session_id` → 実際は `stripe_checkout_session_id`。
- `charge.refunded` / `payment_intent.payment_failed` のマッピング → 未実装（200 で受け流す）。
- 「`POST /checkout` は認証スキップ」 → 現在は認証とメール確認が必須。
- subscription / Billing Portal / CheckoutAttempt の記述を追加。
