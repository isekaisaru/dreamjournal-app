---
title: "個人開発で Stripe Webhook を本番稼働させた全記録"
emoji: "💳"
type: "tech"
topics: ["stripe", "rails", "nextjs", "webhook", "個人開発"]
published: false
---

## はじめに

夢記録 AI アプリ「ユメログ」を個人開発しています。
その機能のひとつとして、Stripe を使った寄付決済を実装し、本番環境（Vercel × Render）で稼働させました。

Stripe の公式ドキュメントはとても充実していますが、実際にやってみると

- フロントとバックエンドが別ドメイン
- Rails API モード
- HttpOnly Cookie 認証
- Webhook の冪等性
- 本番運用時のログや切り分け

のように、設計判断が必要なポイントがいくつもありました。

最初は「決済成功後に success URL に飛ぶなら、それを見て保存すればよいのでは？」と思っていたのですが、そこが大きな誤解でした。
この記事では、実際にどう設計し、なぜその実装にしたのかを残します。

---

## 全体の構成

```text
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

フロントエンドは Next.js（App Router, Vercel）、バックエンドは Rails 7.1 API モード（Render）で、別ドメイン構成です。

---

## Step 1：なぜ Webhook が必要なのか

最初は、

「決済が終わったら /donation/success に遷移するのだから、その画面に来たら DB に保存すればよいのでは？」

と思っていました。

でも、これには問題があります。

**1. ユーザーが success URL まで来るとは限らない**

決済完了直後に

- ブラウザを閉じる
- 通信が切れる
- タブを閉じる

と、success URL に到達しません。

**2. success URL は決済完了の証明にならない**

URL を直接叩けば success 画面には行けてしまいます。
つまり、

```
success 画面に到達した ≠ 決済が本当に完了した
```

Stripe から直接バックエンドに届く Webhook を「正」として扱い、署名を検証してから DB に保存する構成にしました。

---

## Step 2：フロントエンドの中継エンドポイント

Vercel のフロントから Render のバックエンドへ直接リクエストすると、別ドメインなので HttpOnly Cookie が届きません。

そこで、Next.js の Route Handler を中継に使いました。

```typescript
// frontend/app/api/checkout/route.ts
export async function POST(req: Request) {
  const backendUrl = resolveBackendUrl();

  if (!backendUrl) {
    return Response.json({ error: "BACKEND_URL_NOT_SET" }, { status: 500 });
  }

  const TIMEOUT_MS = 15_000; // Render コールドスタート対策
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${backendUrl}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.get("cookie") ?? "", // JWT Cookie を転送
      },
      signal: controller.signal,
    });

    const data = await upstream.json().catch(() => ({}));
    return Response.json(data, { status: upstream.status });
  } catch (e: any) {
    if ((e as Error)?.name === "AbortError") {
      return Response.json(
        { error: `Checkout request timed out after ${TIMEOUT_MS / 1000}s` },
        { status: 504 }
      );
    }
    return Response.json({ error: "UPSTREAM_FETCH_FAILED" }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

ポイントは、**Cookie ヘッダーをそのままバックエンドに転送すること**です。
これで Rails 側の JWT 認証が通ります。

この中継がないと、フロントからは「ログインしているのにバックエンドでは未認証」のような状態になります。

また、バックエンド URL の解決処理は別に切り出し、Vercel 本番・Preview・ローカルで安全に動くようにしています。Preview 環境から本番バックエンドへ誤って流出しないようフェイルセーフも入れています。

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

### `client_reference_id` を入れる理由

Webhook が届いたときに、「この支払いは誰のものか？」を特定する必要があります。
候補はいくつかありますが、信頼度はこう考えました。

| 解決手段 | 信頼性 | 備考 |
|---|---|---|
| `client_reference_id` | ◎ | 自分でセットした値がそのまま返ってくる |
| `stripe_customer_id` | ○ | ユーザーに紐づいていれば確実 |
| メールアドレス | △ | 変更や不一致の可能性がある |

そのため、主経路は `client_reference_id` にしました。

> **注意**：Stripe のドキュメントでは `client_reference_id` にパスワード等の機密情報を入れないよう推奨されています。DB の整数 ID であれば問題ありません。

### Stripe Customer を再利用する理由

毎回 Customer を作ると、同じユーザーの決済履歴が分散してしまいます。
そこで `stripe_customer_id` を User に保存し、2回目以降は再利用する形にしました。

ただし、Stripe 側で Customer が削除されていると API エラーになるので、削除済みまたは不正な ID の場合は新規作成にフォールバックするようにしています。

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

テスト中に Stripe Dashboard 側で Customer を削除してしまい、次の決済でエラーになったことがありました。削除済み Customer をそのまま使うとセッション作成が失敗するため、このチェックが必要です。

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
rescue Stripe::SignatureVerificationError => e
  # 署名不一致 → 偽リクエストまたは設定ミス。ログに残して 400 を返す
  Rails.logger.warn("[Webhook] Signature verification failed: #{e.message}")
  return head :bad_request
end
```

ここで大事なのは **`request.raw_post` を使うこと**です。

最初はここで詰まりました。Rails の通常のパラメータ処理を通すと、Stripe が署名計算した元のボディと内容が変わってしまい、検証が通らなくなります。

### 冪等性：同じイベントを2回処理しない

Stripe の Webhook は再送されることがあります（at-least-once 配信）。
そのため、同じイベントを2回処理しない仕組みが必要です。

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

`processed_webhook_events` テーブルの `stripe_event_id` に `unique: true` インデックスを張り、DB レベルで重複を防いでいます。

アプリ側だけで「まだ存在しないなら保存」とやると、同時リクエストで競合する可能性があります。
DB 制約まで含めて守るのが重要だと学びました。

処理中に例外が発生した場合は `marker.destroy!` でレコードを削除し、次回の再送で再処理できるようにしています。

### ユーザーの特定（3段階フォールバック）

```ruby
session = event.data.object

user = User.find_by(id: session.client_reference_id)           # 主経路
user ||= User.find_by(stripe_customer_id: session.customer)    # 第2経路
email = session.customer_details&.email.presence || session.customer_email
user ||= User.find_by(email: email)                            # 第3経路
```

主経路が失敗しても復旧できるよう、3段階で解決するようにしています。
ユーザー解決が複数ルートあると、本番運用時の安心感がかなり変わりました。

---

## Step 5：データモデルの変遷

最初はシンプルなスキーマから始めました。

```ruby
create_table :payments do |t|
  t.references :user, null: false
  t.string :stripe_session_id, null: false
  t.integer :amount, null: false
  t.string :status, null: false, default: "completed"
end
```

その後、Stripe の取り扱いを考えて拡張しました。

```diff ruby
- rename_column :payments, :stripe_session_id, :stripe_checkout_session_id
+ # カラム名を Stripe の命名に合わせて変更
+ rename_column :payments, :stripe_session_id, :stripe_checkout_session_id

+ add_column :payments, :stripe_payment_intent_id, :string
+ add_column :payments, :currency, :string, limit: 3

+ # 既存レコードへの backfill（currency が未設定の行を jpy に統一）
+ execute "UPDATE payments SET currency = 'jpy' WHERE currency IS NULL"
+ change_column_null :payments, :currency, false
```

`stripe_payment_intent_id` を持つようにしたのは、将来的に返金や照会が必要になったとき Session ID だけでは足りないからです。

---

## Step 6：観測性（Observability）

決済は、失敗してもユーザー画面だけでは分かりにくい処理です。
そのため、構造化ログを実装しました。

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

実際に出力されるログのイメージ：

```
[Payments] event=checkout.request.received user_id=42
[PaymentsKPI] counter=checkout.customer.reused value=1 user_id=42
[PaymentsKPI] counter=checkout.session.created value=1 user_id=42
[Payments] event=webhook.event.received event_type=checkout.session.completed stripe_event_id=evt_xxx
[PaymentsKPI] counter=webhook.payment.saved value=1 user_id=42
```

これで「どこまで進んだか」「どこで止まったか」を切り分けやすくなりました。

---

## Step 7：Supabase 利用時の Row Level Security

DB に Supabase を使っている場合、PostgREST 経由で DB に直接アクセスされる経路があります。
`payments` や `processed_webhook_events` が外部から直接参照・操作されないよう、RLS を有効化しました。

```ruby
# マイグレーション
execute "ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;"
execute "ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;"
```

RLS を有効化してポリシーを追加しない → 「全行拒否（Default Deny）」になります。
Rails のサービスアカウントは `BYPASSRLS` 権限があるので引き続き操作できます。

決済やWebhookの記録が外部から直接見えてしまわないようにする意味で、見落としやすいですが大事な設定でした。

---

## ローカル開発での Webhook テスト

Stripe CLI を使うと、ローカルの Rails に Webhook を転送できます。

```bash
# Webhook をローカルに転送
stripe listen --forward-to localhost:3001/webhooks/stripe

# 任意のイベントをトリガー
stripe trigger checkout.session.completed
```

`stripe listen` 起動時に表示されるシークレット（`whsec_...`）をローカルの `STRIPE_WEBHOOK_SECRET` に設定します。**本番用のシークレットとは別物**なので注意が必要です。

---

## はまったポイント

### 1. `raw_post` を使わないと署名検証が通らない

Webhook 周りは「イベントが来ない」のではなく、「来ているけど自分で落としている」ことがあります。
署名検証エラーが出たらまず `raw_post` を使っているか確認です。

### 2. `FRONTEND_URL` の末尾スラッシュ

`"#{frontend_url}/donation/success"` の `frontend_url` に末尾スラッシュが入っていると `//donation/success` になります。
設定時に除去するか、コード側で `gsub(/\/+$/, "")` しておくと安全です。

### 3. `STRIPE_WEBHOOK_SECRET` のローカルと本番の混同

`stripe listen` で得られるシークレットはローカルテスト用です。
本番では Stripe Dashboard の Webhook 設定から取得した別のシークレットを使います。混同すると署名検証が全滅します。

### 4. 削除済み Stripe Customer でセッション作成するとエラー

テスト中に Stripe Dashboard 側で Customer を削除してしまうことがあります。
次回決済時に `Stripe::InvalidRequestError` が発生するので、`customer.deleted` のチェックと新規作成フォールバックが必要です。

---

## まとめ

個人開発で Stripe Webhook を本番稼働させるうえで、特に大事だったのは次の点でした。

| ポイント | 対策 |
|---|---|
| 決済完了の正として Webhook を使う | success URL だけで判断しない |
| 署名検証で偽リクエストを弾く | `STRIPE_WEBHOOK_SECRET` + `raw_post` |
| 同じイベントの二重処理を防ぐ | `processed_webhook_events` + DB unique 制約 |
| Cookie を別ドメインに渡す | Next.js Route Handler で中継 |
| ユーザー解決を複数経路で用意する | `client_reference_id` → `stripe_customer_id` → email |
| どこで止まったか見えるようにする | 構造化ログ + KPI カウンター |

Stripe のドキュメント自体は充実していますが、実際の構成に落とし込むと自分で決めることが多かったです。
同じように、Next.js + Rails API + 別ドメイン構成で Stripe を扱う人の参考になればうれしいです。

---

## 参考

- [Stripe Webhooks ドキュメント](https://stripe.com/docs/webhooks)
- [Stripe Checkout ドキュメント](https://stripe.com/docs/payments/checkout)
- [stripe-ruby gem](https://github.com/stripe/stripe-ruby)
- ユメログのソースコード：https://github.com/isekaisaru/dream-journal-app
