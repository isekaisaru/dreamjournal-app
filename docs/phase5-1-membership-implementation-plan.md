# YumeTree Phase 5-1 memberships基盤 実装計画

作成日: 2026-05-28
ステータス: 実装計画ドキュメントのみ（migration・コード変更は行わない）
前提: Phase 5-0 設計ドキュメント（docs/phase5-membership-design.md）に基づく

---

## このPRでやること

- `memberships` テーブルの migration
- `Membership` model（enum・validation・association）
- DB制約（CHECK制約・一意インデックス・外部キー）
- 5つのAPI（招待作成・一覧・承認・拒否・関係解除）
- RSpecテスト（model spec・request spec）

## このPRでやらないこと

- `dreams.visibility` カラムの追加（Phase 5-2）
- 共有夢一覧API（Phase 5-3）
- フロントエンド実装（Phase 5-4）
- `public` 公開・コメント・通知・メール送信
- 複数メンバー・家族グループ
- Stripe連携
- Dependabot対応

---

## 1. Migration案

### テーブル: `memberships`

```
create_table :memberships do |t|
  t.references :inviter, null: false, foreign_key: { to_table: :users }
  t.references :invitee, null: false, foreign_key: { to_table: :users }
  t.string :status, null: false, default: 'pending'
  t.timestamps
end
```

### DB制約（execute で追加）

**自己招待防止 CHECK制約:**
```sql
ALTER TABLE memberships
  ADD CONSTRAINT check_no_self_invite
  CHECK (inviter_id != invitee_id);
```

**双方向一意インデックス:**

A→B と B→A を同じ2人の関係として扱うため、標準のUNIQUE制約ではなく、
LEAST/GREATEST を使った関数インデックスを使用する。

```sql
CREATE UNIQUE INDEX idx_memberships_unique_pair
  ON memberships (LEAST(inviter_id, invitee_id), GREATEST(inviter_id, invitee_id));
```

このインデックスにより、以下が両方ともエラーになる:
- A→B の招待がある状態で B→A の招待を作成しようとする
- 同じ向きの重複招待を作成しようとする

**クエリ用インデックス（パフォーマンス）:**
```sql
-- 自分が関係するmembershipを取得するクエリに使用
CREATE INDEX idx_memberships_inviter ON memberships (inviter_id);
CREATE INDEX idx_memberships_invitee ON memberships (invitee_id);
```

### migrationファイルの構成方針

1. `create_table` でテーブルとカラムを作成
2. `execute` でCHECK制約を追加
3. `execute` でLEAST/GREATESTの一意インデックスを追加
4. 通常の `add_index` でinviter_id / invitee_id のインデックスを追加

---

## 2. Membership model案

### association

```ruby
belongs_to :inviter, class_name: 'User'
belongs_to :invitee, class_name: 'User'
```

### status enum

文字列バックのenumを使用する。整数enumは後でステータスが追加されたときに管理しにくいため、
文字列で定義しDBの値を人間が読める形式にする。

```ruby
enum :status, {
  pending:  'pending',
  accepted: 'accepted',
  rejected: 'rejected',
  removed:  'removed'
}
```

これにより以下のメソッドが使える:
- `membership.pending?` / `membership.accepted?` など
- `membership.accepted!` でステータスを変更
- `Membership.pending` / `Membership.accepted` でスコープ

### validations

**1. 自己招待防止**
```ruby
validate :inviter_is_not_invitee

def inviter_is_not_invitee
  errors.add(:invitee_id, 'は自分自身にできません') if inviter_id == invitee_id
end
```

**2. 双方向ペアの一意性（Railsレベル）**

DBの一意インデックスが最終防衛線だが、Rails側でも同等のチェックを行い
エラーメッセージを分かりやすくする。

```ruby
validate :no_duplicate_pair, on: :create

def no_duplicate_pair
  smaller_id = [inviter_id, invitee_id].min
  larger_id  = [inviter_id, invitee_id].max

  exists = Membership.where(
    'LEAST(inviter_id, invitee_id) = ? AND GREATEST(inviter_id, invitee_id) = ?',
    smaller_id, larger_id
  ).exists?

  errors.add(:base, 'この2人の間にはすでに招待が存在します') if exists
end
```

**3. ステータス遷移の制限**

許可する遷移は以下のみ:
```
pending  -> accepted
pending  -> rejected
accepted -> removed
```

```ruby
VALID_TRANSITIONS = {
  'pending'  => %w[accepted rejected],
  'accepted' => %w[removed],
  'rejected' => [],
  'removed'  => []
}.freeze

validate :valid_status_transition, on: :update

def valid_status_transition
  return unless status_changed?
  allowed = VALID_TRANSITIONS[status_was] || []
  unless allowed.include?(status)
    errors.add(:status, "は #{status_was} から #{status} に変更できません")
  end
end
```

**4. accepted な相手が既にいる場合の招待作成防止**

MVPでは1ユーザーにつき accepted な相手は1人まで。

```ruby
validate :no_existing_accepted_partner, on: :create

def no_existing_accepted_partner
  already_accepted = Membership.accepted.where(
    'inviter_id = ? OR invitee_id = ?', inviter_id, inviter_id
  ).exists?

  errors.add(:base, '既に承認済みのパートナーがいます') if already_accepted
end
```

**5. status の値制限**

enumが自動的にバリデーションするが、不正な文字列が直接セットされることも防ぐ。

```ruby
validates :status, inclusion: { in: statuses.keys }
```

### クラスメソッド（候補）

```ruby
# ユーザーが関係する全membershipを取得する
def self.involving(user_id)
  where('inviter_id = ? OR invitee_id = ?', user_id, user_id)
end

# 2ユーザー間のmembershipを取得する
def self.between(user_a_id, user_b_id)
  where(
    'LEAST(inviter_id, invitee_id) = ? AND GREATEST(inviter_id, invitee_id) = ?',
    [user_a_id, user_b_id].min,
    [user_a_id, user_b_id].max
  )
end
```

### 権限チェックメソッド（候補）

```ruby
# 招待を承認・拒否できるのは invitee だけ
def invitee?(user)
  invitee_id == user.id
end

# 関係解除はどちらの当事者でも可能
def participant?(user)
  inviter_id == user.id || invitee_id == user.id
end
```

---

## 3. User model への追記案

```ruby
has_many :sent_memberships,     class_name: 'Membership', foreign_key: :inviter_id, dependent: :destroy
has_many :received_memberships, class_name: 'Membership', foreign_key: :invitee_id, dependent: :destroy
```

---

## 4. ルーティング案

```ruby
resources :memberships, only: [:create, :index] do
  member do
    patch :accept
    patch :reject
    patch :remove
  end
end
```

これにより生成されるルート:

| メソッド | パス | アクション | 用途 |
|---|---|---|---|
| POST | /memberships | create | 招待作成 |
| GET | /memberships | index | 招待一覧 |
| PATCH | /memberships/:id/accept | accept | 招待承認 |
| PATCH | /memberships/:id/reject | reject | 招待拒否 |
| PATCH | /memberships/:id/remove | remove | 関係解除 |

---

## 5. API仕様案

### 共通事項

- 全エンドポイントでログイン必須（`before_action :authenticate_user!`）
- レスポンスはJSON
- 非権限者へのアクセスは `404 Not Found`（`403 Forbidden` は使わない）

---

### POST /memberships（招待作成）

**リクエスト:**
```json
{ "invitee_email": "partner@example.com" }
```

**レスポンス 201:**
```json
{
  "id": 1,
  "inviter": { "id": 1, "email": "me@example.com" },
  "invitee": { "id": 2, "email": "partner@example.com" },
  "status": "pending",
  "created_at": "2026-05-28T00:00:00Z"
}
```

**エラーケース:**

| ケース | ステータス | メッセージ |
|---|---|---|
| 自分自身を招待 | 422 | 自分自身を招待できません |
| 同じ2人の重複 | 422 | この2人の間にはすでに招待が存在します |
| accepted が既にいる | 422 | 既に承認済みのパートナーがいます |
| 相手が存在しない | 404 | - |
| 未ログイン | 401 | - |

**招待はemailで相手を指定する**理由: IDを直接受け付けるとフロントエンドでIDを推測する必要が生じるため。
相手のemailからサーバー側でユーザーを解決する。

---

### GET /memberships（招待一覧）

**レスポンス 200:**
```json
{
  "sent": [
    {
      "id": 1,
      "invitee": { "id": 2, "email": "partner@example.com" },
      "status": "pending",
      "created_at": "2026-05-28T00:00:00Z"
    }
  ],
  "received": [
    {
      "id": 3,
      "inviter": { "id": 5, "email": "other@example.com" },
      "status": "pending",
      "created_at": "2026-05-27T00:00:00Z"
    }
  ]
}
```

`sent` = 自分が inviter のもの / `received` = 自分が invitee のもの

---

### PATCH /memberships/:id/accept（招待承認）

- 実行できるのは `invitee` のみ
- 対象は `pending` のmembershipのみ
- status を `accepted` に変更する前に、`current_user`（invitee）が既存の `accepted` membership を持っていないことを確認する
- status を `accepted` に変更する前に、`inviter` も既存の `accepted` membership を持っていないことを確認する
- invitee または inviter のどちらかに既存の `accepted` partner がいる場合は更新せず 422 を返す
- 成功したら `status: "accepted"` を返す

**注意: accept は update 操作のため `no_existing_accepted_partner` バリデーション（`on: :create`）は動作しない。**
invitee 側・inviter 側の accepted 制限は、コントローラーの accept アクション内で明示的にチェックする。
これにより、招待作成後にどちらかが別の相手と `accepted` になった場合でも、1ユーザー1 accepted partner 制限を守る。

**accept アクションの処理順序（擬似コード）:**

```ruby
def accept
  # invitee? チェック
  # pending? チェック
  # invitee に既存 accepted partner がないかチェック
  # inviter に既存 accepted partner がないかチェック
  # 両方OKなら status を accepted に更新
end
```

**エラーケース:**

| ケース | ステータス |
|---|---|
| 自分が inviter のmembership | 404 |
| pending でないmembership | 422 |
| 他人のmembership | 404 |
| invitee 側に既存の accepted partner がいる | 422 |
| inviter 側に既存の accepted partner がいる | 422 |

---

### PATCH /memberships/:id/reject（招待拒否）

- 実行できるのは `invitee` のみ
- 対象は `pending` のmembershipのみ
- 成功したら `status: "rejected"` を返す

---

### PATCH /memberships/:id/remove（関係解除）

- 実行できるのは `inviter` または `invitee`（どちらの当事者でも可）
- 対象は `accepted` のmembershipのみ
- 成功したら `status: "removed"` を返す

**Phase 5-1 での責務:**
- Phase 5-1 では membership の status を `removed` に更新するのみ
- `dreams.visibility` が存在しないため、相手の夢へのアクセス制御はこの時点では実装しない

**Phase 5-2 以降の責務:**
- `dreams.visibility` の追加により、`removed` 状態の相手は `partner` 夢を閲覧できなくなる
- この時点で「関係解除と同時にアクセスが失効する」という仕様が有効になる

---

## 6. コントローラー構成案

```ruby
class MembershipsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_membership, only: [:accept, :reject, :remove]

  def index
    # 自分が関係するmembershipを sent / received に分けて返す
  end

  def create
    # invitee_email からユーザーを解決して招待を作成する
  end

  def accept
    # invitee のみ実行可能。pending -> accepted
  end

  def reject
    # invitee のみ実行可能。pending -> rejected
  end

  def remove
    # inviter または invitee のどちらでも実行可能。accepted -> removed
  end

  private

  def set_membership
    # 自分が当事者の membership のみ取得できるようにする
    # 他人のIDを直打ちされても 404 を返す
    @membership = Membership.involving(current_user.id).find_by(id: params[:id])
    render json: { error: 'Not Found' }, status: :not_found unless @membership
  end
end
```

`set_membership` は `involving(current_user.id)` でスコープを絞ってから `find_by` することで、
他人のmembership IDを直打ちされても 404 を返す。`find` を使わないことで ActiveRecord::RecordNotFound
が 500 になるリスクを防ぐ。

---

## 7. RSpecテスト項目

### model spec（spec/models/membership_spec.rb）

**associations:**
- `inviter` は User に属する
- `invitee` は User に属する

**validations（自己招待）:**
- `inviter_id == invitee_id` の場合は invalid
- `inviter_id != invitee_id` の場合は valid

**validations（双方向一意性）:**
- A→B の membership がある場合、B→A の作成は invalid
- A→B の membership がある場合、A→B の重複作成は invalid
- A→B の membership とまったく無関係な C→D は valid

**validations（ステータス遷移）:**
- `pending -> accepted` は valid
- `pending -> rejected` は valid
- `accepted -> removed` は valid
- `pending -> removed` は invalid
- `rejected -> accepted` は invalid
- `removed -> pending` は invalid

**validations（accepted制限）:**
- 自分が inviter で accepted なmembershipがある場合、別の相手への招待作成は invalid

**enum:**
- `pending?`, `accepted?`, `rejected?`, `removed?` が正しく動作する
- `accepted!` でステータスが変わる

---

### request spec（spec/requests/memberships_spec.rb）

**POST /memberships:**
- 正常: 201・`pending` のmembershipが作成される
- 自分自身へ: 422
- 重複ペア: 422（A→B が存在する状態で B→A を試みる）
- accepted が既にいる状態で: 422
- 存在しないemailで: 404
- 未ログインで: 401

**GET /memberships:**
- 正常: 200・sent と received が分かれて返る
- 他ユーザーのmembershipは含まれない
- 未ログインで: 401

**PATCH /memberships/:id/accept:**
- 正常（invitee として）: 200・status が accepted になる
- inviter が自分のmembership を承認しようとする: 404
- pending でないmembership に対して: 422
- 他人のmembership ID直打ち: 404
- 未ログインで: 401

**PATCH /memberships/:id/reject:**
- 正常（invitee として）: 200・status が rejected になる
- inviter が拒否しようとする: 404
- pending でないmembership に対して: 422
- 他人のmembership ID直打ち: 404
- 未ログインで: 401

**PATCH /memberships/:id/remove:**
- 正常（inviter として）: 200・status が removed になる
- 正常（invitee として）: 200・status が removed になる
- accepted でないmembership に対して: 422
- 他人のmembership ID直打ち: 404
- 未ログインで: 401

---

## 8. 未解決事項（実装前に決める）

### `rejected` 後の再招待方針

Phase 5-0設計では「MVP後に検討」としている。
Phase 5-1実装では、**最も保守的な方針**を採用する。

**Phase 5-1での決定**: A→B の関係レコードが `rejected` / `removed` であっても、
新しい招待を作成しようとすると「すでに関係が存在します」エラーにする。

理由: 再招待を後から許可する方向への変更は容易。逆に、いったん許可してから制限するのは難しい。

**将来、再招待を許可する場合の注意:**

現状の一意インデックスは status を含まず、2人のペアのみで一意を保証する。
そのため、`rejected` / `removed` レコードが残っている限り、同じ2人の新しい招待は作成できない。

再招待を許可したい場合は、以下のいずれかのアプローチで DB インデックス設計の見直しが必要になる:

- status を含めた一意制約に変更する（active な状態のみ一意にする）
- 既存の `rejected` / `removed` レコードを再利用して status を `pending` に戻す
- `rejected` / `removed` レコードを削除または論理削除してから新規作成する

いずれもスキーマ変更またはデータ移行を伴う。Phase 5 以降で再招待を検討する際は設計を再レビューすること。

### 誰が remove できるか

**Phase 5-1での決定**: `inviter` と `invitee` のどちらも `remove` を実行できる。

理由: どちらの当事者も「共有をやめたい」と思ったときに手段を持つべき。
セキュリティの観点から、片方だけが解除できる状態は避ける。

---

## 9. PRタイトル案

```
feat: memberships基盤を追加（招待・承認・拒否・関係解除API）
```

---

## 10. 実装順序

1. migration作成・`db:migrate`
2. `Membership` model（association・enum・validation）
3. `User` model への `has_many` 追記
4. model spec を書いてパスさせる
5. ルーティング追加
6. `MembershipsController` の5アクション実装
7. request spec を書いてパスさせる
8. `rails console` で動作確認
9. RSpec全件グリーン確認
10. PR作成

model を固めてからコントローラーを作る。テストを先に書いてもよい（TDD）。

---

## 11. 完了基準

- [ ] `rails db:migrate` が正常に完了する
- [ ] `rails console` で `Membership.create!` の動作確認ができる
- [ ] model spec が全件パスする
- [ ] request spec が全件パスする（認証・権限・遷移の全ケース）
- [ ] `bundle exec rspec` 全件グリーン
- [ ] 他人のmembership IDを直打ちすると 404 が返ることを確認した
- [ ] `dreams.visibility` には一切触れていない
- [ ] フロントエンドファイルに変更がない
