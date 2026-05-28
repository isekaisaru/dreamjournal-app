# YumeTree Phase 5 再設計: dream_profiles 型

作成日: 2026-05-29
ステータス: 設計ドキュメントのみ（migration・コード変更は行わない）
前バージョン: docs/phase5-membership-design.md（memberships型・保留）

---

## Phase 5 の目的（再定義）

1アカウントの中に複数の「夢プロフィール」を作り、家族・友達・キャラクターごとに夢を切り分けて記録できるようにする。

任天堂「ともだちコレクション わくわく生活」のように、1つの箱庭の中に複数のキャラクターが共存し、それぞれの夢・感情・AI画像を身内で楽しく見返せる体験を目指す。

YumeTree は「ひとりで安心して使えるAI夢ノート」から、「家族の夢を一緒に育てる記録箱」へと自然に拡張する。

---

## memberships型 vs dream_profiles型 比較

なぜ今は dream_profiles型を優先するのか。

| 観点 | memberships型（旧設計） | dream_profiles型（新設計） |
|---|---|---|
| **ユーザー体験** | 別アカウント同士が招待・承認する手続きが必要。夢を見せるまでに複数のステップがある | 1アカウントで完結。プロフィールを作るだけで使える。すぐ体験できる |
| **子ども・家族向けUX** | 子どもが自分のアカウントを持つ必要がある。小さな子は使えない | 親が家族全員の夢を代わりに記録できる。アカウントを持てない子でも参加できる |
| **実装の重さ** | 招待・承認・拒否・関係解除・双方向一意制約・権限失効と多くの状態管理が必要 | FKを1本追加してCRUDを作るだけ。状態遷移がなく実装がシンプル |
| **プライバシーリスク** | 夢の公開範囲管理（visibility）が複雑。誤公開リスクへの対処が重い | 1アカウント内の操作なので誤公開リスクが低い。権限モデルがシンプル |
| **YumeTreeのコンセプトとの相性** | 「共有ツール」寄りの体験。SNSに近づく | 「家族の記録箱・箱庭」寄りの体験。YumeTreeの世界観と一致する |
| **将来拡張性** | 複数アカウント間の複雑な権限管理に発展しやすく、設計負債になりやすい | dream_profiles に将来「招待フラグ」を追加することで、memberships的な共有も後から実現できる |

**結論: dream_profiles型を先に実装し、memberships型は将来オプションとして温存する。**

---

## ユーザーストーリー

- ユーザーは「自分」「パートナー」「長男 太郎」のように、夢プロフィールを最大5人まで作れる。
- 夢を書くときに「誰の夢か」をプロフィールから選べる。
- 夢一覧にプロフィールの名前・絵文字が表示される。
- プロフィール別に夢をフィルターして見返せる。
- プロフィールは削除ではなくアーカイブ（非表示）で管理する。
- 初回ログイン時に「自分」プロフィールが自動的に作られている。
- 既存の夢は自動的に「自分」プロフィールに紐づけられる。

---

## MVPでやること

- `dream_profiles` テーブルを設計・作成する
- 1アカウント最大5プロフィールの制限を設ける
- アカウント作成時に「自分」プロフィールを自動生成する
- 既存ユーザーの夢を「自分」プロフィールに移行する
- `dreams` テーブルに `dream_profile_id` を追加する
- プロフィール一覧・作成・更新・アーカイブのAPIを作る
- 夢作成・編集画面でプロフィールを選択できるようにする
- 夢一覧にプロフィールのアバター（絵文字・カラー）を表示する
- プロフィール別の夢フィルターを作る

## MVPでやらないこと

- 別アカウント同士の招待・承認（memberships型）
- `dreams.visibility`（public / partner 公開範囲）
- public公開
- コメント機能
- 通知・メール送信
- 外部共有URL
- 複数アカウント間共有
- Stripe連携
- 箱庭アニメーション・夢の部屋
- AI夢ニュースの実装
- プロフィール別シェアカード（Phase 5以降）
- プロフィール別夢の木（Phase 5以降）

---

## データモデル案

### dream_profiles テーブル

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | bigserial | PK | |
| `user_id` | bigint | NOT NULL, FK→users | アカウント所有者 |
| `name` | string | NOT NULL | 表示名（例: パパ / 長男 太郎 / ネコのミ―）|
| `avatar_emoji` | string | NOT NULL, default: "😴" | 絵文字アバター |
| `color` | string | NOT NULL, default: "#6366f1" | プロフィールカラー（hex）|
| `relationship` | string | NOT NULL, default: "self" | 関係性（後述） |
| `active` | boolean | NOT NULL, default: true | false = アーカイブ（論理削除）|
| `position` | integer | NOT NULL, default: 0 | 表示順 |
| `created_at` | datetime | NOT NULL | |
| `updated_at` | datetime | NOT NULL | |

#### relationship の値

| 値 | 表示ラベル | 説明 |
|---|---|---|
| `self` | 自分 | アカウント所有者本人。自動作成。最初の1件 |
| `partner` | パートナー | 配偶者・恋人 |
| `child` | 子ども | 息子・娘 |
| `parent` | 親 | 父・母 |
| `friend` | 友達 | 友人 |
| `pet` | ペット | 動物・ペット |
| `other` | その他 | キャラクター・その他 |

MVPでは relationship は表示目的のみ。ビジネスロジックに影響させない。

#### DB制約案

```sql
-- 1アカウント最大5プロフィール
-- Railsバリデーションで制限し、DBレベルではINDEXで一意性を担保する

-- プロフィール表示順のインデックス
CREATE INDEX idx_dream_profiles_user_position ON dream_profiles (user_id, position);

-- active なプロフィールのみを対象とした部分インデックス（パフォーマンス）
CREATE INDEX idx_dream_profiles_active ON dream_profiles (user_id) WHERE active = true;
```

---

### dreams テーブルへの追加カラム

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| `dream_profile_id` | bigint | FK→dream_profiles | 誰の夢か |

**nullable方針（移行を考慮）:**

migration は2段階で行う。

```
Step 1: dream_profile_id を nullable で追加
Step 2: 既存ユーザーに「自分」プロフィールを自動作成し、
        全既存 dreams の dream_profile_id を埋める
Step 3: dream_profile_id を NOT NULL に変更
```

Step 2 は data migration として別 migration ファイルで実装する。
Step 3 は Step 2 が完全に完了してから実行する。

---

## 「自分」プロフィールの自動生成方針

**既存ユーザー対応:**

移行用 migration で全ユーザーに `relationship: "self"` のプロフィールを1件作成し、
そのユーザーの全 dreams に `dream_profile_id` を設定する。

```
migration 例のイメージ（実装ではない）:
User.find_each do |user|
  profile = user.dream_profiles.create!(
    name:          "自分",
    avatar_emoji:  "😴",
    color:         "#6366f1",
    relationship:  "self",
    active:        true,
    position:      0
  )
  user.dreams.update_all(dream_profile_id: profile.id)
end
```

**新規ユーザー対応:**

`User` モデルの `after_create` コールバックで「自分」プロフィールを自動作成する。

---

## バリデーション案

**DreamProfile model:**

- `name`: 必須、最大30文字
- `avatar_emoji`: 必須
- `color`: 必須、hex形式（`/\A#[0-9a-fA-F]{6}\z/`）
- `relationship`: 定義済みの値のみ許可
- `active` なプロフィールが1アカウント内で最大5件
  - アーカイブ済み（active: false）は上限にカウントしない
- `self` プロフィールは1アカウントに1件のみ
  - relationship: "self" の uniqueness を user_id スコープで保証

**Dream model への追記:**

- `dream_profile_id`: 必須（移行完了後）
- `dream_profile` が自分のアカウント所有のプロフィールであること（他ユーザーのプロフィールIDを直打ちできない）

---

## API案

### DreamProfilesController

| メソッド | パス | 用途 |
|---|---|---|
| GET | /dream_profiles | プロフィール一覧（active のみ） |
| POST | /dream_profiles | プロフィール作成（上限5件チェック） |
| PATCH | /dream_profiles/:id | プロフィール更新（name / emoji / color / position）|
| PATCH | /dream_profiles/:id/archive | アーカイブ（active: false）|

**共通:**
- 全エンドポイントでログイン必須
- 他ユーザーのプロフィールIDを直打ちされても `404 Not Found`
- `self` プロフィールはアーカイブ不可（自分自身は消せない）

### Dreams API への影響

- 既存の `POST /dreams`・`PATCH /dreams/:id` に `dream_profile_id` パラメータを追加
- 省略時は `self` プロフィールを自動セットする方針を検討
- `GET /dreams` にクエリパラメータ `?profile_id=:id` を追加してフィルタリング

---

## UI案

### プロフィール選択（夢作成・編集）

- 夢入力フォームの上部に「誰の夢？」セクションを設ける
- 絵文字 + 名前のチップ形式で選択
- デフォルトは「自分」プロフィール

```
[ 😴 自分 ] [ 👶 太郎 ] [ 🐱 ミー ] [ + 追加 ]
```

### 夢一覧

- 各夢カードに絵文字アバターとプロフィール名を表示
- プロフィールカラーで左ボーダーまたはバッジを色付け

```
┌─────────────────────────────┐
│ 😴 自分  |  2026-05-29      │
│ 不思議な森を歩く夢...        │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 👶 太郎  |  2026-05-28      │
│ 宝物を見つける夢...           │
└─────────────────────────────┘
```

### プロフィールフィルター

- 夢一覧の上部に横スクロール可能なフィルターチップを設ける

```
[ すべて ][ 😴 自分 ][ 👶 太郎 ][ 🐱 ミー ]
```

### プロフィール管理（設定画面）

- 設定画面にプロフィール一覧を表示
- 追加・編集・アーカイブ操作
- 上限5件の残り枠を表示
- `self` プロフィールにはアーカイブボタンを表示しない

---

## 権限ルール

dream_profiles 型では memberships 型と比べて権限モデルがシンプル。

- dream_profiles は `user_id` で所有者が決まる
- 他ユーザーの dream_profiles にはアクセスできない
- dreams の `dream_profile_id` は、自分の dream_profiles の id のみ許可
- 夢の CRUD は従来通り所有者本人のみ

**ID直打ち対策:**

```
GET /dream_profiles/:id
→ DreamProfile.where(user_id: current_user.id).find_by(id: params[:id])
   見つからない場合は 404（他ユーザーのIDを直打ちしても同様）

POST /dreams (dream_profile_id を指定)
→ current_user.dream_profiles.find_by(id: dream_profile_id)
   見つからない場合はバリデーションエラー
```

---

## 実装フェーズ案

| Phase | 内容 | PRタイトル案 |
|---|---|---|
| Phase 5-A | dream_profiles基盤（migration・model・CRUD API）| `feat: dream_profilesテーブルとAPIを追加` |
| Phase 5-B | dreams に dream_profile_id 追加・既存データ移行 | `feat: dreamsにdream_profile_idを追加して既存夢を移行` |
| Phase 5-C | 夢一覧・夢詳細でプロフィール表示 | `feat: 夢一覧にプロフィールアバターを表示` |
| Phase 5-D | プロフィール別フィルター | `feat: 夢一覧にプロフィールフィルターを追加` |
| Phase 5-E | 設定画面のプロフィール管理UI | `feat: 設定画面でプロフィールを管理できるようにする` |

Phase 5-B の移行は、既存ユーザーの夢データに影響するためテストが特に重要。

---

## 将来アイディア（MVPスコープ外）

Phase 5 MVP が安定した後に検討する。

- **プロフィール別夢の木**: 各プロフィールの夢がどのように積み重なっているかを木で可視化
- **夢の部屋**: プロフィールごとに夢ワールドを持つ箱庭UI
- **家族の夢ニュース**: 「今日、長男が不思議な夢を見た」をまとめて見返す画面
- **夢の相性・夢リンク**: 同じキーワードが出た家族の夢を繋げる
- **家族内リアクションスタンプ**: 夢に家族がスタンプを押せる（ハートなど）
- **プロフィール別シェアカード**: 「太郎の夢」としてシェアカードを生成
- **モルペウスの一言コメント**: プロフィールごとにAIコメントを生成
- **将来的な別アカウント共有**: dream_profiles に `shareable: true` フラグを追加し、他アカウントから閲覧できるURLを発行する形で memberships 的な共有を後から追加できる

---

## PR #313 の扱い

PR #313（Phase 5-1 memberships基盤の実装計画ドキュメント）は **クローズ推奨**。

理由:
- dream_profiles型へ方向転換するため、memberships型の実装計画はそのままでは進めない
- ただし PR #313 の設計で固めた以下の知識は dream_profiles 設計にも活かせる:
  - ID直打ち対策（`find_by` + スコープ絞り込み）
  - 404 vs 403 の方針
  - DB制約とRailsバリデーションの両立方針
  - データ移行の段階的アプローチ
- memberships型設計ドキュメント（docs/phase5-membership-design.md）は削除せず残す。将来、別アカウント間共有を設計するときの参照資料として価値がある

**推奨アクション:**
1. PR #313 をクローズする（コメントに「dream_profiles型へ方針転換のため」と記載）
2. docs/phase5-1-membership-implementation-plan.md はローカルに残すが、README等には含めない
3. 本ドキュメント（phase5-dream-profiles-design.md）をPR化して方針を記録する
4. 方針確定後、Phase 5-A の実装計画ドキュメントを別途作成する

---

## 実装前の確認ポイント

以下を確認してから Phase 5-A の実装計画（migration・model・spec）を作る。

### 確認1: dream_profile_id の nullable 移行期間

既存の夢データに `dream_profile_id` を埋める data migration は、全ユーザー分を一括処理するため本番でも安全に実行できる設計にする必要がある。

- 1万件を超えるレコードがある場合、`update_all` は十分か、それとも `find_each` でバッチ処理が必要か
- ダウンタイムなしで migration を完走できるか

→ 本番レコード数を確認してから移行方式を決める。

### 確認2: 「自分」プロフィールの after_create コールバック

- `User` モデルに `after_create :create_self_profile` を追加するか
- それとも migration でのみ処理し、コールバックは持たないか

→ コールバックがあると RSpec の `create(:user)` に影響する。テストが重くなる可能性がある。FactoryBot に `skip_callbacks` 設定が必要になる場合を考慮する。

### 確認3: 上限5件の扱い

- active: true のプロフィールが5件のとき、新たに作成しようとしたらどうするか
- アーカイブ済みを復元（active: true に戻す）したとき、5件を超えたらエラーにするか

→ 「active が5件以下」を常に保証するロジックをバリデーションに入れる。

### 確認4: dream_profiles の物理削除ポリシー

- `active: false` で論理削除のみとし、物理削除はしない
- アーカイブされたプロフィールに紐づく夢レコードはどうするか
  - 夢レコードは残す（`dream_profile_id` は null にしない）
  - 一覧には表示しないが、夢の中でプロフィール名は「アーカイブ済み」と表示する

→ この方針をAPIレスポンスに反映する設計が必要。

---

## PRタイトル案

```
docs: Phase 5をdream_profiles型に再設計
```
