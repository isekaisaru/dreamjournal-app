# 7月「守りのMust」本番運用ランブック（順序厳守）

> 対象: あなた（本番操作を行う人）。Claudeが伴走で作成。
> 環境: バックエンド=Render / フロント=Vercel / DB=Render Postgres / 決済=Stripe。
> 原則: **①→②→③の順**。特に②は **NULL確認→ensure→backfill→0件確認→NOT NULL の順を絶対に崩さない**（0件になる前にNOT NULL化すると本番が壊れる）。
> 記号: ✅=チェック / 🟢=GO条件 / 🛑=STOP（満たさなければ次へ進まない）

---

## 鉄則

1. **②のNOT NULL migration は「残NULL 0件」を自分の目で確認してから**しか実行しない。
2. **「不安なら再実行してよい」のは ②の `ensure_self_profiles` / `backfill_dream_profile_id` の2タスクだけ**（この2つは冪等・何度実行しても安全）。それ以外は再実行前提にしない:
   - ⚠️ **NOT NULL migration（2-5）は再実行しない**。既に `null: false` 済みなら不要。雛形の安全弁で二重適用時も安全に止まる。
   - ⚠️ **③ Stripe の購入(checkout)は再実行＝実際の課金が二重発生しうる**。通し確認は**テストモード**で行い（後述）、本番課金は最小限に。「不安だからもう一回」は絶対にしない。

---

## ① 本番 Trial P3 実機確認（スマホ実機）

> 目的: お試し→夢作成→本登録で**夢が消えないこと**を本番で自分の目で確認（PR #392の着地確認）。

手順（本番URL: https://dreamjournal-app.vercel.app をスマホのブラウザで）:

- [ ] **ログアウト状態**で開く（別ユーザーが残っていれば一度ログアウト）
- [ ] トップの「**まず試す**」→ お試し(trial)ユーザーで開始
- [ ] お試しのまま**夢を1つ記録**（テキストでOK）。タイトルをメモ（例「テストP3-<日付>」）
- [ ] 画面に **TrialBanner（残回数バナー）** が出ていることを確認
- [ ] そのまま「**本登録/つづきから**」で**本登録**（メール＋パスワード）
- [ ] 本登録後、ホームで **さっき記録した夢が残っている**ことを確認 🟢
- [ ] **TrialBannerが消えている**ことを確認 🟢
- [ ] （軽い回帰）ホーム→もり→マイ夢→設定 が開けること

🛑 もし夢が消える／TrialBannerが残るなら、**②③に進まず**その場をメモ（再現手順・時刻）してClaudeに共有。

---

## ② データ安全化（dream_profile_id）— 順序厳守

> 背景: `dreams.dream_profile_id` は現在 **nullable**（`schema.rb` で `null: false` 無し）。全夢をselfプロフィールへ割り当ててから NOT NULL 化して Phase 5 を名実ともに完成させる。
> 実行場所: **Render → 該当バックエンドサービス → Shell**（`bundle exec` が使える環境）。

### 2-1. 実行前のNULL件数を確認（現状把握）

Rails console:
```bash
bundle exec rails runner 'puts "NULL dreams = #{Dream.where(dream_profile_id: nil).count} / total = #{Dream.count}"'
```
または SQL（Render DBのPSQL）:
```sql
SELECT COUNT(*) AS null_dreams FROM dreams WHERE dream_profile_id IS NULL;
```
- [ ] NULL件数を記録: __________ 件

### 2-2. 全ユーザーに self プロフィールを用意（冪等）

```bash
bundle exec rake dream_profiles:ensure_self_profiles
```
- 期待出力: `完了: 対象 N ユーザー | 作成 X 件 | スキップ Y 件`
- [ ] エラーなく完了

### 2-3. NULLの夢を self プロフィールへ割り当て（冪等・バッチ）

```bash
bundle exec rake dream_profiles:backfill_dream_profile_id
```
- 期待出力: `完了: 割当 X 件 | selfなしスキップ Y ユーザー | 残NULL Z 件`
- [ ] 出力の **`残NULL Z 件`** を記録: __________
- 🛑 `selfなしスキップ` が 0 でない場合 → 2-2(ensure) を再実行してから 2-3 をやり直す

### 2-4. 残NULL 0件を確認（NOT NULL化のゲート）

```bash
bundle exec rails runner 'puts Dream.where(dream_profile_id: nil).count'
```
- [ ] 出力が **`0`** 🟢
- 🛑 **0でなければ絶対に 2-5 に進まない**。2-2→2-3 を繰り返す。原因不明ならClaudeへ。

### 2-5. NOT NULL migration（**残NULL 0件確認後のみ**）

新規migrationを作成（ローカル/リポジトリで）:
```bash
cd backend
bundle exec rails g migration MakeDreamProfileIdNotNullOnDreams
```
生成ファイルの中身を以下に:
```ruby
class MakeDreamProfileIdNotNullOnDreams < ActiveRecord::Migration[7.2]
  def up
    # 念のため安全弁: 残NULLがあれば止める（0件のはず）
    remaining = execute("SELECT COUNT(*) FROM dreams WHERE dream_profile_id IS NULL").first["count"].to_i
    raise "dream_profile_id に NULL が #{remaining} 件残っています。backfillを先に完了してください。" if remaining.positive?

    change_column_null :dreams, :dream_profile_id, false
  end

  def down
    change_column_null :dreams, :dream_profile_id, true
  end
end
```
> ⚠️ Rails版は `ActiveRecord::Migration[X.Y]` を既存migrationに合わせる（`backend/db/migrate/` の他ファイルの版数を踏襲）。

- [ ] migrationをコミット→PR→マージ→**本番デプロイ**
- [ ] 本番で `bundle exec rails db:migrate`（Renderのデプロイで自動 or Shellで手動）
- [ ] `schema.rb` の `dreams.dream_profile_id` に `null: false` が付いたこと 🟢
- [ ] アプリが正常（夢作成・一覧・森が動く）

🟢 ここまでで **Phase 5 が名実ともに完成**。

---

## ③ Stripe 本番フロー通しテスト

> 目的: 購入→Webhook→premium反映→Portal の一連が通ること。
> ルート: `POST /checkout`（購入セッション作成）/ `POST /billing_portal`（顧客ポータル）/ `POST /webhooks/stripe`（Webhook受信）。
> ⚠️ **まず Stripe テストモードで通し確認する**（同じコード経路・実課金なし）。テストで通ってから、必要なら本番モードで**1回だけ**実購入する。**再実行＝二重課金**なので安易に繰り返さない。

手順（推奨: **テストモード**）:
- [ ] Stripeダッシュボードを **テストモード** で開く（本番実購入を試すのは最後に1回だけ）
- [ ] アプリの**サブスク/課金画面**から「プレミアム」購入 → Stripe Checkout へ遷移
- [ ] テストカード `4242 4242 4242 4242` / 任意の未来日 / 任意CVC で決済
- [ ] Stripe **Developers → Webhooks** で `checkout.session.completed` 等が **配信成功(200)** になっていること 🟢
- [ ] アプリに戻り、**user.premium が true** になっていること（プレミアム表示・AI無制限など）🟢
  - 確認: `bundle exec rails runner 'u=User.find_by(email:"<自分のメール>"); puts u&.premium'`
- [ ] 課金画面から **顧客ポータル(billing_portal)** を開けること（プラン確認・解約導線）🟢
- [ ] （任意）ポータルで解約 → Webhook（`customer.subscription.deleted`）→ premium が false に戻ること

🛑 Webhookが200にならない/premiumが反映されない場合 → Webhookの配信ログ・署名・エンドポイントURLをメモしてClaudeへ（署名検証・冪等性の観点で一緒に切り分け）。

---

## 完了後（KPI更新）

7月OBLのKPIにチェック:
- [ ] Trial P3 本番QA完了
- [ ] `dream_profile_id` NULL 0件
- [ ] NOT NULL migration 完了
- [ ] Stripe本番フロー 1回成功
- [ ] README更新（運用・改善・課金・ユーザーテストを明記）
- [ ] Search Console 登録（SEO土台は #393 で反映済み）

> 進めながら詰まったら、出力・エラー文をそのまま貼ってください。順序判断とデバッグを伴走します。
