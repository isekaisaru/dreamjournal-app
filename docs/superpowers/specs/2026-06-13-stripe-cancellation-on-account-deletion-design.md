# 設計: アカウント削除前のStripeサブスク即時解約

- 日付: 2026-06-13
- ブランチ（予定）: `feat/cancel-stripe-subscription-on-account-deletion`
- 関連: PR #353（アカウント削除フローのフロントエンド安全性改善・マージ済み）

## 背景 / 解決する問題

本番実機検証で確認した最優先の安全性課題:

> `User#destroy` 時に Stripe 解約処理が一切ない（`before_destroy` コールバックなし）。
> 課金中ユーザーがアカウント削除すると、Stripe 側のサブスクは生き続けてカードへの請求が継続する。

現状の `UsersController#destroy` は `current_user.destroy` を呼ぶだけ。
`User has_many :subscriptions, dependent: :destroy` によって**ローカルDBの subscription 行は消える**が、
**Stripe 側のサブスクリプションは解約されない**ため、アプリ上はアカウントが存在しないのに課金だけが続く「幽霊サブスク」が発生しうる。

このPRは「**退会する前に、課金の蛇口を必ず閉める**」守りの強化である。

## スコープ

### このPRでやること（バックエンドのみ）

- `User#destroy` の前に、Stripe 側の active なサブスクを**即時解約**するサービスクラスを追加
- 解約に失敗したらアカウント削除を**中断**し、422 を返す
- service spec / request spec を追加

### このPRでやらないこと（別PR）

- `subscriptions` / `payments` の保持・匿名化設計の変更
- `DELETE /users/:id` → `DELETE /account` リファクタ（`set_user` / `params[:id]` の撤去）
- フロントエンドの変更（**不要** — 後述）

> **保持設計に関する明記:**
> このPRでは local subscriptions / payments の保持設計は変更しない。
> `User.destroy` によって local subscription 行が削除される可能性があるため、削除後の webhook 更新には依存しない。
> このPRの責務は、`User.destroy` 前に Stripe 側の課金を即時停止することに限定する。

## 設計判断（確定事項）

| 論点 | 決定 |
|---|---|
| 配置 | **サービスクラス** `SubscriptionCanceler`（モデルにもコントローラにも Stripe ロジックを置かない） |
| 解約失敗時 | **アカウント削除を中断**（422 を返す。`current_user.destroy` に到達させない） |
| 解約タイミング | **即時解約**（`Stripe::Subscription.cancel`。日割り返金なし） |
| 解約対象 status | 既存の `Subscription::ACTIVE_STATUSES`（`active`, `past_due`） |
| 冪等性 | `resource_missing`（対象が既に存在しない）のみ成功扱い。その他の `InvalidRequestError` は失敗扱い |

### 配置をサービスクラスにする理由

既存コードは副作用をサービス層（`AuthService` / `PaymentsObservability` など）に寄せる規約がある。
Stripe 呼び出しという「失敗しうるネットワーク処理」をモデル（`before_destroy`）やコントローラ直書きから隔離することで、
モデルを薄く保ち、単体テストを容易にする。

```
DELETE /users/:id  (UsersController#destroy)
        │
        ├─ 1. SubscriptionCanceler.new(current_user).call
        │      └─ active/past_due のサブスクを Stripe::Subscription.cancel で即時解約
        │           ├─ 成功 / resource_missing → OK（冪等）
        │           └─ その他 Stripe エラー → CancellationError を raise
        │
        ├─ 2a. 解約成功 → current_user.destroy（dependent: :destroy でローカルDBも削除）→ 200
        └─ 2b. 解約失敗 → destroy せず 422 + エラーJSON
```

**順序が肝**: 解約（ネットワーク）が先、`destroy`（DB）が後。
解約が失敗したら `destroy` に到達しないため、「削除したのに課金が残る」が構造的に起きない。

## コンポーネント

### `SubscriptionCanceler`（新規）

`backend/app/services/subscription_canceler.rb`

- 責務: 渡された User の active な Stripe サブスクを全て即時解約する。**DB更新はしない**（`Subscription` を query するが、行の更新・削除は行わない）。
- 依存: `Stripe::Subscription`, `Subscription::ACTIVE_STATUSES`
- インターフェース: `SubscriptionCanceler.new(user).call` → 成功時は正常 return、失敗時は `CancellationError` を raise

```ruby
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
    if e.respond_to?(:code) && e.code == "resource_missing"
      Rails.logger.info("[AccountDeletion] 解約スキップ（既に不在）sub=#{sub.stripe_subscription_id}: #{e.message}")
      return
    end
    raise CancellationError, e.message
  rescue Stripe::StripeError => e
    # ネットワーク障害・認証エラー・レート制限など → 中断
    raise CancellationError, e.message
  end
end
```

> 冪等性の方針: `InvalidRequestError` は原則 `CancellationError` として扱う。
> ただし Stripe 側で subscription が既に存在しないことを示す `resource_missing` のケースのみ、課金停止済みとみなして成功扱いする。
> （「もう退会済みです」はOK、「会員番号が変です」はNG）

### `UsersController#destroy`（修正）

`backend/app/controllers/users_controller.rb`

```ruby
def destroy
  begin
    SubscriptionCanceler.new(current_user).call
  rescue SubscriptionCanceler::CancellationError => e
    Rails.logger.error("[AccountDeletion] Stripe解約失敗 user_id=#{current_user.id}: #{e.message}")
    return render json: { error: "サブスクリプションの解約に失敗しました。時間をおいて再度お試しください。" },
                  status: :unprocessable_entity
  end

  if current_user.destroy
    cookies.delete(:access_token)
    cookies.delete(:refresh_token, path: '/')
    render json: { message: "ユーザーアカウントが正常に削除されました" }, status: :ok
  else
    render json: { error: "許可されていない操作です。" }, status: :unauthorized
  end
end
```

`set_user` / `params[:id]` は今回は触らない（別PR）。

## エラーハンドリングと再試行

`SubscriptionCanceler` は active なサブスクを順に解約する。途中で1件失敗すると `CancellationError` を raise し、
コントローラが 422 を返してアカウント削除を中断する。

- 例: sub A 解約成功 → sub B でネットワーク失敗 → 422 で中断
- ユーザーが再試行 → sub A は `resource_missing` で冪等にスキップ → sub B を再解約 → 全成功 → `destroy`

これにより「部分的に解約された状態」からも安全に再試行できる。

## フロントエンドとの接続（変更なし）

PR #353 で以下が実装済みのため、**このPRはバックエンドのみ**で完結する:

- `deleteUser()` は API 失敗時に例外を再 throw する
- `handleDelete` は catch して「さくじょに しっぱいしました。しばらくしてから もういちど ためしてね。」をモーダル内に表示する

422 → `apiClient.delete` が reject → `deleteUser` 再throw → `handleDelete` catch → 既存のエラー表示。
PR #353 の投資がそのまま効く。

## テスト戦略

Stripe のスタブは既存の `spec/requests/billing_portal_spec.rb` の作法に合わせる:
- 成功: `expect(Stripe::Subscription).to receive(:cancel).with(stripe_subscription_id).and_return(...)`
- 失敗: `allow(Stripe::Subscription).to receive(:cancel).and_raise(Stripe::StripeError.new('...'))`
- ヘルパー: `authenticated_post` 相当の認証付きリクエスト（`type: :request`）、factory `:user` / `:subscription`、共有例 `'unauthorized request'`

### service spec — `spec/services/subscription_canceler_spec.rb`

- active なサブスク → 正しい `stripe_subscription_id` で `Stripe::Subscription.cancel` を呼ぶ
- past_due なサブスク → 解約する
- canceled なサブスク → Stripe を呼ばない（スキップ）
- 複数 active サブスク → 全件解約する
- `Stripe::InvalidRequestError(code: "resource_missing")` → 成功扱い（raise しない）
- `Stripe::InvalidRequestError`（resource_missing 以外） → `CancellationError` を raise
- `Stripe::APIConnectionError`（StripeError サブクラス） → `CancellationError` を raise
- サブスクなし → no-op で正常 return（Stripe を呼ばない）

### request spec — `spec/requests/users_spec.rb`（destroy）

- active サブスクあり + 解約成功 → user が削除される・200・Cookie 削除
- 解約失敗（`CancellationError`） → **user は DB に残る**・422・エラーJSON・`current_user.destroy` 未到達
- 解約成功 + `current_user.destroy` が false → 既存の destroy false 分岐に入る・**user は残る**・Cookie は削除しない・401（[users_controller.rb:45](../../../backend/app/controllers/users_controller.rb#L45) の既存挙動を維持）
  - 課金安全上は許容（Stripe 停止は完了済み）。再試行時は `resource_missing` で冪等にスキップされる
- サブスクなし → user 削除・200（Stripe 未呼出）
- 未認証 → 401（既存挙動を維持）

## 実装順序（TDD）

1. service spec を書く（RED）→ `SubscriptionCanceler` 実装（GREEN）
2. request spec を書く（RED）→ `UsersController#destroy` 修正（GREEN）
3. 全 spec green を確認
