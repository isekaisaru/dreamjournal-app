# 7月「守りのMust」本番運用ランブック（順序厳守）

> 対象: あなた（本番操作を行う人）。Claudeが伴走で作成。
> 環境: バックエンド=Render / フロント=Vercel / DB=Render Postgres / 決済=Stripe。
> 原則: **①→②→③の順**。特に②は **NULL確認→ensure→backfill→0件確認→NOT NULL の順を絶対に崩さない**（0件になる前にNOT NULL化すると本番が壊れる）。
> 記号: ✅=チェック / 🟢=GO条件 / 🛑=STOP（満たさなければ次へ進まない）

---


## 進捗（2026年7月25日）

| 項目 | 状態 | 確認根拠 |
|---|---|---|
| ① Trial P3 | ✅ 完了済み | PR #392 マージ後に本番QA成功。スマホ幅Playwrightでも、trialユーザーのDB保存済み夢が本登録後も残ることを確認済み |
| ② dream_profile_id安全化 | ✅ 完了済み | `backend/db/schema.rb` は `dream_profile_id, null: false`。2026年7月4日のNOT NULL migrationも反映済み |
| ③ Stripe通しテスト | ⬜ 未確認 | Stripeダッシュボードと購入画面での操作が必要 |
| README更新 | ✅ 完了済み | PR #444 マージ済み |
| Search Console登録 | ⬜ 未確認 | ユーザー操作が必要 |

> 現在の次の運用タスクは **③ Stripeのテストモード通し確認**。②は完了済みのため、migrationやバックフィルを再実行しない。

---

## 鉄則

1. **②は完了済み。2-2〜2-5の操作系コマンドは再実行しない。** 状態を確かめる場合は、2-1の読み取り専用コマンドだけを使う。
2. 履歴上、再実行可能だったのは `ensure_self_profiles` / `backfill_dream_profile_id` の2タスクだけ。NOT NULL migrationは再実行しない。
3. **③ Stripe の購入(checkout)は、再実行すると実際の課金が二重発生しうる。** 通し確認はまず**テストモード**で行い、本番課金は必要な場合のみ1回に限定する。「不安だからもう一回」は絶対にしない。

## ① 本番 Trial P3 実機確認（スマホ実機）— ✅ 完了済み・再確認手順

> 目的: trialユーザーとして`/home`からDB保存した夢が、`convert_trial`による本登録後も消えないことを確認する（PR #392の着地確認）。
>
> ⚠️ `/trial`画面の「記録だけする」とAIプレビューの夢はReactの画面内stateだけで、DBには保存されない。**引き継ぎ確認用の夢は必ず`/home`から記録する。**

手順（本番URL: https://dreamjournal-app.vercel.app をスマホのブラウザで）:

- [ ] **ログアウト状態**で開く（別ユーザーが残っていれば一度ログアウト）
- [ ] トップの「**今朝の夢を入れてみる**」から `/trial` を開く
- [ ] 夢の内容を入力し「**AIにきいてみる**」を1回押す
  - この操作で未認証の場合に`POST /auth/trial_login`が実行され、trialユーザーとしてログインする
  - ここで表示される夢はプレビュー用であり、引き継ぎ確認の対象にはしない
- [ ] AI分析が表示されたら、ブラウザで `https://dreamjournal-app.vercel.app/home` を開く
- [ ] `/home`に **TrialBanner（「お試し中」・残回数・本登録CTA）** が出ていることを確認
- [ ] `/home`の「**夢を記録する**」から`/dream/new`へ進み、引き継ぎ確認用の夢を1つ保存する
  - タイトルをメモ（例「テストP3-<日付>」）
- [ ] `/home`に戻り、保存した夢が一覧にあることを**本登録前に確認**
- [ ] TrialBannerの「**とうろくして ぜんぶ つかう**」から`/register`へ進み、メール＋パスワードで本登録
- [ ] 本登録後の`/home`で、さきほどDB保存した夢が残っていることを確認 🟢
- [ ] **TrialBannerが消えている**ことを確認 🟢
- [ ] （軽い回帰）ホーム→もり→マイ夢→設定 が開けること

🛑 夢が消える／TrialBannerが残る場合は、**③に進まず**再現手順・発生時刻・夢のタイトルを記録して共有する。

---

## ② データ安全化（dream_profile_id）— ✅ 完了済み・再実行禁止

> 2026年7月25日の`main`確認では、`backend/db/schema.rb`の`dreams.dream_profile_id`に`null: false`が付いている。2026年7月4日のNOT NULL migrationは`RUN_MIGRATIONS=true`の本番デプロイで適用済み。
>
> migrationには「残NULLがあれば例外で停止する」安全弁があるため、適用済みであることはNOT NULL化の前提を通過したことも示す。**新しいmigrationの作成、backfill、`db:migrate`の手動再実行は行わない。**

### 2-1. 必要な場合だけ読み取り確認

Render Shellで、DBを変更しない次のコマンドだけを使う:

```bash
bundle exec rails runner 'puts "NULL dreams = #{Dream.where(dream_profile_id: nil).count} / total = #{Dream.count}"'
```

- [x] `schema.rb`: `t.bigint "dream_profile_id", null: false`
- [x] NOT NULL migration反映済み
- [x] Phase 5 完成
- [ ] 任意の再確認をする場合、出力が`NULL dreams = 0`であること

🛑 読み取り確認で0以外が出た場合は異常。操作系コマンドで直そうとせず、出力と時刻を記録して原因を切り分ける。

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

7月OBLのKPI:
- [x] Trial P3 本番QA完了（PR #392）
- [x] `dream_profile_id` NULL 0件
- [x] NOT NULL migration 完了
- [ ] Stripeテストモード通し確認成功
- [ ] 必要な場合のみ、Stripe本番フローを1回成功
- [x] README更新（PR #444）
- [ ] Search Console 登録（SEO土台は #393 で反映済み）

> 次は③を上から1項目ずつ進める。詰まった場合は、Stripeのイベント名・HTTPステータス・発生時刻をそのまま共有する。
