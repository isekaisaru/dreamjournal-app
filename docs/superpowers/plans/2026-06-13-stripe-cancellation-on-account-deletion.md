# Stripeサブスク即時解約（アカウント削除前）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** アカウント削除（`UsersController#destroy`）の前に、Stripe 側の active なサブスクを即時解約し、解約に失敗したら削除を中断する。

**Architecture:** `SubscriptionCanceler` サービスが Stripe 側の解約だけを担当（DB更新はしない）。コントローラが「解約 → 成功なら destroy」をオーケストレーションし、解約失敗時は 422 を返す。フロントは PR #353 の既存エラー表示で受けるため変更なし。

**Tech Stack:** Rails 7（APIモード）, Stripe gem 19.1.0, RSpec, FactoryBot

**設計ドキュメント:** [docs/superpowers/specs/2026-06-13-stripe-cancellation-on-account-deletion-design.md](../specs/2026-06-13-stripe-cancellation-on-account-deletion-design.md)

---

## 前提・実行環境

- **バックエンドのテストは Docker 内でのみ実行する。** 全 `rspec` コマンドは以下の前置きを付ける:
  ```
  docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend bundle exec rspec <path>
  ```
  以降の手順では `<RSPEC>` をこの前置きの短縮表記として使う。コンテナ未起動なら先に `make dev-up`。
- ルート: `DELETE /users/:id`（`config/routes.rb:43` `resources :users, only: [:destroy]`）
- 認証ヘルパー（`spec/support/auth_helpers.rb`）: `authenticated_delete(path, user)`
- 共有例（`spec/support/shared_examples/unauthorized_request.rb`）: `it_behaves_like 'unauthorized request', :delete, '/users/0'`
- factory: `:user`（`spec/factories/users.rb`）, `:subscription`（`spec/factories/subscriptions.rb`、デフォルト `status: "active"`）

## File Structure

| ファイル | 種別 | 責務 |
|---|---|---|
| `backend/app/services/subscription_canceler.rb` | 新規 | User の active な Stripe サブスクを即時解約する。DB更新はしない。失敗時 `CancellationError` を raise |
| `backend/app/controllers/users_controller.rb` | 修正（`destroy`） | 解約 → 成功なら `current_user.destroy`、失敗なら 422 |
| `backend/spec/services/subscription_canceler_spec.rb` | 新規 | `SubscriptionCanceler` の単体テスト |
| `backend/spec/requests/users_spec.rb` | 新規 | `DELETE /users/:id` の結合テスト |

---

## Task 1: SubscriptionCanceler サービス

**Files:**
- Create: `backend/app/services/subscription_canceler.rb`
- Test: `backend/spec/services/subscription_canceler_spec.rb`

- [ ] **Step 1: 失敗するテストを書く**

`backend/spec/services/subscription_canceler_spec.rb` を新規作成:

```ruby
require 'rails_helper'

RSpec.describe SubscriptionCanceler do
  let(:user) { create(:user) }

  describe '#call' do
    context 'active なサブスクがある場合' do
      it '正しい stripe_subscription_id で Stripe::Subscription.cancel を呼ぶ' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_active_1', status: 'active')

        expect(Stripe::Subscription).to receive(:cancel).with('sub_active_1')

        described_class.new(user).call
      end
    end

    context 'past_due なサブスクがある場合' do
      it '解約する' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_pastdue_1', status: 'past_due')

        expect(Stripe::Subscription).to receive(:cancel).with('sub_pastdue_1')

        described_class.new(user).call
      end
    end

    context 'canceled なサブスクのみの場合' do
      it 'Stripe を呼ばない（スキップ）' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_canceled_1', status: 'canceled')

        expect(Stripe::Subscription).not_to receive(:cancel)

        described_class.new(user).call
      end
    end

    context '複数の active サブスクがある場合' do
      it '全件解約する' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_multi_1', status: 'active')
        create(:subscription, user: user, stripe_subscription_id: 'sub_multi_2', status: 'past_due')

        expect(Stripe::Subscription).to receive(:cancel).with('sub_multi_1')
        expect(Stripe::Subscription).to receive(:cancel).with('sub_multi_2')

        described_class.new(user).call
      end
    end

    context 'Stripe 側に既に存在しない場合（resource_missing）' do
      it '成功扱いし、CancellationError を raise しない' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_gone_1', status: 'active')

        allow(Stripe::Subscription).to receive(:cancel).and_raise(
          Stripe::InvalidRequestError.new('No such subscription: sub_gone_1', 'subscription', code: 'resource_missing')
        )

        expect { described_class.new(user).call }.not_to raise_error
      end
    end

    context 'resource_missing 以外の InvalidRequestError の場合' do
      it 'CancellationError を raise する' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_bad_1', status: 'active')

        allow(Stripe::Subscription).to receive(:cancel).and_raise(
          Stripe::InvalidRequestError.new('Invalid parameter', 'subscription', code: 'parameter_invalid')
        )

        expect { described_class.new(user).call }.to raise_error(SubscriptionCanceler::CancellationError)
      end
    end

    context 'ネットワーク障害（APIConnectionError）の場合' do
      it 'CancellationError を raise する' do
        create(:subscription, user: user, stripe_subscription_id: 'sub_net_1', status: 'active')

        allow(Stripe::Subscription).to receive(:cancel).and_raise(
          Stripe::APIConnectionError.new('connection failed')
        )

        expect { described_class.new(user).call }.to raise_error(SubscriptionCanceler::CancellationError)
      end
    end

    context 'サブスクが無い場合' do
      it 'Stripe を呼ばず正常に return する' do
        expect(Stripe::Subscription).not_to receive(:cancel)

        expect { described_class.new(user).call }.not_to raise_error
      end
    end
  end
end
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `<RSPEC> spec/services/subscription_canceler_spec.rb`
Expected: FAIL（`uninitialized constant SubscriptionCanceler`）

- [ ] **Step 3: 最小実装を書く**

`backend/app/services/subscription_canceler.rb` を新規作成:

```ruby
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
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `<RSPEC> spec/services/subscription_canceler_spec.rb`
Expected: PASS（9 examples, 0 failures）

- [ ] **Step 5: コミット**

```bash
git add backend/app/services/subscription_canceler.rb backend/spec/services/subscription_canceler_spec.rb
git commit -m "feat: Stripeサブスク即時解約サービス SubscriptionCanceler を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 2: UsersController#destroy に解約処理を統合

**Files:**
- Modify: `backend/app/controllers/users_controller.rb`（`destroy` アクション、現状 44-55 行）
- Test: `backend/spec/requests/users_spec.rb`（新規）

- [ ] **Step 1: 失敗するテストを書く**

`backend/spec/requests/users_spec.rb` を新規作成:

```ruby
require 'rails_helper'

RSpec.describe 'Users API', type: :request do
  describe 'DELETE /users/:id' do
    it_behaves_like 'unauthorized request', :delete, '/users/0'

    context 'active サブスクがあり、Stripe 解約に成功する場合' do
      it 'ユーザーを削除し 200 を返す' do
        user = create(:user)
        create(:subscription, user: user, stripe_subscription_id: 'sub_ok_1', status: 'active')

        expect(Stripe::Subscription).to receive(:cancel).with('sub_ok_1')

        authenticated_delete("/users/#{user.id}", user)

        expect(response).to have_http_status(:ok)
        expect(User.exists?(user.id)).to be false
      end
    end

    context 'Stripe 解約に失敗する場合' do
      it 'ユーザーを削除せず 422 を返す' do
        user = create(:user)
        create(:subscription, user: user, stripe_subscription_id: 'sub_ng_1', status: 'active')

        allow(Stripe::Subscription).to receive(:cancel).and_raise(
          Stripe::APIConnectionError.new('connection failed')
        )

        authenticated_delete("/users/#{user.id}", user)

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)['error']).to include('解約に失敗')
        expect(User.exists?(user.id)).to be true
      end
    end

    context '解約成功後に destroy が失敗する場合' do
      it '既存の false 分岐に入り、ユーザーは残り 401 を返す' do
        user = create(:user)
        create(:subscription, user: user, stripe_subscription_id: 'sub_dfail_1', status: 'active')

        allow(Stripe::Subscription).to receive(:cancel).with('sub_dfail_1')
        allow_any_instance_of(User).to receive(:destroy).and_return(false)

        authenticated_delete("/users/#{user.id}", user)

        expect(response).to have_http_status(:unauthorized)
        expect(User.exists?(user.id)).to be true
      end
    end

    context 'サブスクが無い場合' do
      it 'Stripe を呼ばずにユーザーを削除し 200 を返す' do
        user = create(:user)

        expect(Stripe::Subscription).not_to receive(:cancel)

        authenticated_delete("/users/#{user.id}", user)

        expect(response).to have_http_status(:ok)
        expect(User.exists?(user.id)).to be false
      end
    end
  end
end
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `<RSPEC> spec/requests/users_spec.rb`
Expected: FAIL（解約失敗ケースで、現状は `cancel` を呼ばず 200 になる／422 にならない）

- [ ] **Step 3: destroy アクションを修正**

`backend/app/controllers/users_controller.rb` の `destroy` アクション（現状 44-55 行）を以下に置き換える:

```ruby
  # ユーザー削除
  def destroy
    # 削除前に Stripe 側のサブスクを即時解約する。失敗したら削除を中断。
    begin
      SubscriptionCanceler.new(current_user).call
    rescue SubscriptionCanceler::CancellationError => e
      Rails.logger.error("[AccountDeletion] Stripe解約失敗 user_id=#{current_user.id}: #{e.message}")
      return render json: { error: "サブスクリプションの解約に失敗しました。時間をおいて再度お試しください。" },
                    status: :unprocessable_entity
    end

    # 削除対象は常に現在のユーザーに限定する
    if current_user.destroy
      # ログアウト処理も忘れずに行う
      cookies.delete(:access_token)
      cookies.delete(:refresh_token, path: '/')
      render json: { message: "ユーザーアカウントが正常に削除されました" }, status: :ok
    else
      render json: { error: "許可されていない操作です。" }, status: :unauthorized
    end
  end
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `<RSPEC> spec/requests/users_spec.rb`
Expected: PASS（5 examples 程度, 0 failures）

- [ ] **Step 5: 関連 spec の回帰確認**

Run: `<RSPEC> spec/services/subscription_canceler_spec.rb spec/requests/users_spec.rb`
Expected: 全 PASS

- [ ] **Step 6: コミット**

```bash
git add backend/app/controllers/users_controller.rb backend/spec/requests/users_spec.rb
git commit -m "feat: アカウント削除前にStripeサブスクを即時解約し、失敗時は削除を中断

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Task 3: 全バックエンド spec の回帰確認

- [ ] **Step 1: バックエンド全 spec を実行**

Run: `<RSPEC> spec/`
Expected: 全 PASS（既存 spec を含めリグレッションなし）

- [ ] **Step 2: 失敗があれば修正、なければ完了**

---

## Self-Review チェック結果

- **Spec coverage:** 解約対象 status（Task1 active/past_due/canceled ケース）、失敗時中断（Task2 422 ケース）、即時解約（`Stripe::Subscription.cancel`）、resource_missing 冪等（Task1）、destroy 失敗ケース（Task2 401）、フロント変更なし（このプランにフロントタスクなし）、保持設計不変更（subscriptions/payments を触るタスクなし）— 全て対応タスクあり。
- **Placeholder scan:** TBD/TODO なし。全テスト・実装コードを記載済み。
- **Type consistency:** `SubscriptionCanceler.new(user).call` / `SubscriptionCanceler::CancellationError` を Task1 定義・Task2 使用で一致。`Stripe::Subscription.cancel(id)`、status は `Subscription::ACTIVE_STATUSES` で一貫。
