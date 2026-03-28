---
title: "個人開発で Stripe Webhook を本番稼働させた全記録"
emoji: "💳"
type: "tech"
topics: ["stripe", "rails", "nextjs", "webhook", "個人開発"]
published: false
---

## はじめに

夢記録 AI アプリ「ユメログ」を個人開発しています。機能の一つとして Stripe を使った寄付決済を実装し、本番環境（Vercel × Render）で稼働させました。

Stripe の公式ドキュメントは充実していますが、「フロントとバックが別ドメイン」「Rails API モード」「Webhook の冪等性をどうするか」といった実際の実装判断は、自分で調べて決める必要がありました。

この記事では、設計の意図ごとに「なぜそう実装したか」を書き残します。

---

## 全体の構成

```
Browser
  ↓ POST /api/checkout
Next.js (Vercel)         ← フロントの中継エンドポイント
  ↓ Cookie を転送して POST /checkout
Rails API (Render)       ← Stripe Checkout Session を作成
  ↓ { url: "https://checkout.stripe.com/..." }
Browser → Stripe Checkout（決済画面）
  ↓ 決済完了
Stripe → POST /webhooks/stripe   ← Stripe が Rails に通知
Rails                             ← 署名検証 → 冪等チェック → Payment 永続化
```

フロントエンドは Next.js の App Router（Vercel）、バックエンドは Rails 7.1 API モード（Render）で、別ドメインです。

---

## Step 1：なぜ Webhook が必要なのか

「決済が終わったら `/donation/success` に遷移するんだから、そこで DB に保存すれば良いのでは？」と最初に思いました。

これが危険な理由は2つです。

1. **ユーザーがブラウザを閉じると成功画面に到達しない**
   支払い完了後にネットが切れたり、タブを閉じた場合、success URL には飛ばない。
2. **success URL は偽装できる**
   URL を直接叩けば success 画面に到達できるため、「画面に到達した＝決済済み」は信用できない。

Stripe から直接バックエンドに届く Webhook を正として扱い、署名を検証してから DB に保存するのが正しいパターンです。

---

## Step 2：フロントエンドの中継エンドポイント

Vercel のフロント（`https://dreamjournal-app.vercel.app`）から直接 Render のバックエンド（`https://dreamjournal-app.onrender.com`）を叩くと、HttpOnly Cookie が別ドメインのため届きません。

そのため、Next.js の Route Handler を中継として使います。

```typescript
// frontend/app/api/checkout/route.ts
export async function POST(req: Request) {
  const backendUrl = resolveBackendUrl();

  const upstream = await fetch(`${backendUrl}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // JWT Cookie をバックエンドへそのまま転送する
      Cookie: req.headers.get("cookie") ?? "",
    },
    signal: AbortSignal.timeout(15_000), // Render コールドスタート対策
  });

  const data = await upstream.json().catch(() => ({}));
  return Response.json(data, { status: upstream.status });
}
```

`Cookie` ヘッダーをそのまま転送するのがポイントです。これで Rails 側の `authorize_request`（JWT 認証）が通ります。

バックエンド URL の解決は別ファイルに切り出し、Vercel 本番・Vercel プレビュー・ローカルで挙動を分けています。Vercel 上では `localhost` のような private host は弾き、Preview 環境からは本番バックエンドへ流出しないようにフェイルセーフを入れています。

---

## Step 3：Stripe Checkout Session の作成

```ruby
# backend/app/controllers/checkout_controller.rb
def create
  frontend_url = ENV['FRONTEND_URL']
  return render json: { error: '...' }, status: :internal_server_error if frontend_url.blank?

  customer_id = ensure_stripe_customer_id!

  session = Stripe::Checkout::Session.create(
    customer: customer_id,
    client_reference_id: current_user.id.to_s,  # ← ユーザー解決の主経路
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'jpy',
        unit_amount: 500,
        product_data: { name: 'ユメログへの応援寄付' },
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: "#{frontend_url}/donation/success",
    cancel_url:  "#{frontend_url}/donation/cancel",
  )

  render json: { url: session.url }, status: :ok
end
```

### `client_reference_id` にユーザー ID を入れる理由

Webhook が届いたとき、「どのユーザーの支払いか」を特定する必要があります。方法は複数あります。

| 解決手段 | 信頼性 | 備考 |
|---|---|---|
| `client_reference_id` | ◎ | 作成時に自分でセットした値がそのまま返ってくる |
| `stripe_customer_id` | ○ | ユーザーに紐付いていれば確実 |
| メールアドレス | △ | ユーザーがメールを変更していると不一致になる |

`client_reference_id` が一番信頼できるので主経路にしています。

### `ensure_stripe_customer_id!` で顧客を再利用する

決済のたびに Stripe Customer を作ると、同一ユーザーの支払い履歴が分散します。`stripe_customer_id` を User に保存し、2回目以降は既存の Customer を使います。

注意点として、Stripe 側で Customer を削除すると「deleted: true」が返ってきます。削除済みの Customer で Checkout Session を作ると API エラーになるので、レスポンスを確認して削除済みなら新規作成にフォールスルーしています。

```ruby
def ensure_stripe_customer_id!
  existing_id = current_user.stripe_customer_id
  if existing_id.present?
    customer = Stripe::Customer.retrieve(existing_id)
    return existing_id unless customer.respond_to?(:deleted) && customer.deleted
    # 削除済みの場合は新規作成へ
  end
  create_and_save_stripe_customer!
rescue Stripe::InvalidRequestError
  # ID が無効（存在しない等）の場合も新規作成
  create_and_save_stripe_customer!
end
```

---

## Step 4：Webhook の受信と処理

### 署名検証

```ruby
# backend/app/controllers/webhooks_controller.rb
skip_before_action :authorize_request, only: [:stripe]

def stripe
  payload    = request.raw_post
  sig_header = request.headers['Stripe-Signature']

  event = Stripe::Webhook.construct_event(
    payload, sig_header, ENV['STRIPE_WEBHOOK_SECRET']
  )
rescue Stripe::SignatureVerificationError
  return head :bad_request
end
```

`raw_post` を使うのが重要です。Rails の通常のパラメータ解析を通すと署名検証に失敗します（ボディが変化するため）。

`STRIPE_WEBHOOK_SECRET` は Stripe CLI や Stripe Dashboard の Webhook 設定画面で取得するシークレットで、ローカル開発用と本番用は**別のシークレット**になります。

### 冪等性：同じイベントを2回処理しない

Stripe は Webhook を最低1回以上配信することを保証しています（at-least-once）。ネットワーク障害などで再送されることがあるため、同じ `stripe_event_id` を2回処理しないようにする必要があります。

```ruby
begin
  ProcessedWebhookEvent.create!(
    stripe_event_id: event.id,
    processed_at: Time.current
  )
rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
  # すでに処理済み → スキップして 200 を返す
  return head :ok
end
```

`processed_webhook_events` テーブルの `stripe_event_id` に `unique: true` インデックスを張り、DB レベルで重複挿入を弾きます。アプリ側チェックのみだと同時リクエストで競合するため、DB 制約が必須です。

処理中に例外が発生した場合は `marker.destroy!` でレコードを削除し、次回の再送で再処理できるようにしています。

### ユーザーの特定（3段階フォールバック）

```ruby
session = event.data.object

user = User.find_by(id: session.client_reference_id)  # 主経路
user ||= User.find_by(stripe_customer_id: session.customer)  # 第2経路
user ||= User.find_by(email: session.customer_details&.email)  # 第3経路
```

`client_reference_id` → `stripe_customer_id` → メールアドレス の順で解決します。主経路が落ちても復旧できるようにしています。

---

## Step 5：データモデルの変遷

最初にシンプルなスキーマで作り、Stripe の要件に合わせて段階的に拡張しました。

```ruby
# 最初のマイグレーション
create_table :payments do |t|
  t.references :user, null: false
  t.string :stripe_session_id, null: false
  t.integer :amount, null: false
  t.string :status, null: false, default: "completed"
end
```

```ruby
# 後続の拡張マイグレーション
rename_column :payments, :stripe_session_id, :stripe_checkout_session_id
add_column :payments, :stripe_payment_intent_id, :string
add_column :payments, :currency, :string, limit: 3

# 既存レコードへの backfill
execute "UPDATE payments SET currency = 'jpy' WHERE currency IS NULL"
change_column_null :payments, :currency, false
```

`stripe_payment_intent_id` を追加したのは、Session ID と PaymentIntent ID は別物で、返金などの操作には PaymentIntent が必要になるためです。

---

## Step 6：観測性（Observability）

決済フローは「動いているかどうか確認しにくい」処理です。エラー検知と正常系の確認のために、構造化ログを実装しています。

```ruby
class PaymentsObservability
  def self.log(event:, level: :info, **context)
    message = +"[Payments] event=#{event}"
    context.compact.each { |k, v| message << " #{k}=#{v}" }
    Rails.logger.public_send(level, message)
  end

  def self.increment(counter, **tags)
    message = +"[PaymentsKPI] counter=#{counter} value=1"
    tags.compact.each { |k, v| message << " #{k}=#{v}" }
    Rails.logger.info(message)
  end
end
```

主なログ出力ポイント：

```
[Payments] event=checkout.request.received user_id=42
[PaymentsKPI] counter=checkout.customer.reused value=1 user_id=42
[PaymentsKPI] counter=checkout.session.created value=1 user_id=42
[Payments] event=webhook.event.received event_type=checkout.session.completed stripe_event_id=evt_xxx
[PaymentsKPI] counter=webhook.payment.saved value=1 event_type=checkout.session.completed user_id=42
```

このログパターンで「どこまで進んでいるか」と「どこで止まったか」を特定できます。

---

## Step 7：Row Level Security（Supabase 使用時）

DB に Supabase を使っている場合、Supabase は PostgREST という REST API 経由で DB に直接アクセスできる口を持っています。`payments` や `processed_webhook_events` が外部から直接参照・操作されるのを防ぐため、RLS（Row Level Security）を有効化しました。

```ruby
# マイグレーション
execute "ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;"
execute "ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;"
```

RLS を有効化してポリシーを追加しないと「全行拒否（Default Deny）」になります。Rails のサービスアカウントは `BYPASSRLS` 権限があるので引き続き操作できます。

---

## ローカル開発での Webhook テスト

Stripe CLI を使えば、ローカルの Rails サーバーに Webhook イベントを転送できます。

```bash
# Webhook をローカルに転送（別ターミナルで実行）
stripe listen --forward-to localhost:3001/webhooks/stripe

# 任意のイベントをトリガー
stripe trigger checkout.session.completed
```

`stripe listen` を起動すると表示されるシークレット（`whsec_...`）を `STRIPE_WEBHOOK_SECRET` に設定します。本番用のシークレットとは別物なので注意してください。

---

## はまったポイント

### 1. `raw_post` を使わないと署名検証が常に失敗する

`request.body.read` ではなく `request.raw_post` を使う必要があります。Rails が `request.body` を一度読み込むとストリームが消費されてしまい、Stripe の署名計算と一致しなくなります。

### 2. `FRONTEND_URL` の末尾スラッシュに注意

`"#{frontend_url}/donation/success"` の `frontend_url` に末尾スラッシュが入っていると `//donation/success` になります。設定時または `resolveBackendUrl` 側で `replace(/\/+$/, "")` して除去しています。

### 3. `STRIPE_WEBHOOK_SECRET` はローカルと本番で異なる

`stripe listen` で得られるシークレットはローカルテスト用です。本番では Stripe Dashboard の Webhook 設定から取得した別のシークレットを使います。本番用を環境変数に入れ忘れると署名検証が全滅します。

### 4. 削除済み Stripe Customer でセッション作成するとエラー

テスト中に Stripe Dashboard で Customer を削除すると、次回の決済時に `Stripe::InvalidRequestError` が発生します。`customer.deleted` のチェックと rescue による新規作成フォールスルーで対応しました。

---

## 本番稼働の確認

Stripe Dashboard の「支払い」タブで件数と金額を確認し、バックエンドログで `[PaymentsKPI] counter=webhook.payment.saved` が出ていることを確認して本番稼働を判断しました。

一次切り分け用の [runbook](docs/runbook-payments.md) も用意し、「決済成功したのに DB に入っていない」「501/502 が出ている」といったケースごとの確認手順を書き残しています。

---

## まとめ

個人開発で Stripe Webhook を本番稼働させるポイントをまとめます。

| ポイント | 対策 |
|---|---|
| 決済完了の正として Webhook を使う | success URL だけで判断しない |
| 署名検証で偽リクエストを弾く | `STRIPE_WEBHOOK_SECRET` + `raw_post` |
| 同じイベントの二重処理を防ぐ | `processed_webhook_events` テーブル + DB unique 制約 |
| Cookie を別ドメインに渡す | Next.js Route Handler で転送 |
| ユーザー解決を3段階でフォールバック | `client_reference_id` → `stripe_customer_id` → email |
| 観測可能な状態を作る | 構造化ログ + KPI カウンター |

Stripe のドキュメントに書いてあることばかりですが、実際の構成（別ドメイン・Railway / Render 等のサービス）に当てはめると考えることが増えます。同じような構成で詰まっている方の参考になれば嬉しいです。

---

## 参考

- [Stripe Webhooks ドキュメント](https://stripe.com/docs/webhooks)
- [Stripe Checkout ドキュメント](https://stripe.com/docs/payments/checkout)
- [stripe-ruby gem](https://github.com/stripe/stripe-ruby)
- ユメログのソースコード：https://github.com/isekaisaru/dream-journal-app
