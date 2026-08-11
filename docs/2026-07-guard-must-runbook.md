# 7月「守りのMust」本番運用ランブック（順序厳守）

> 対象: あなた（本番操作を行う人）。Claudeが伴走で作成。
> 環境: バックエンド=Render / フロント=Vercel / DB=Render Postgres / 決済=Stripe。
> 現在: **①②は完了済み。次は③**（8/12更新）。②の実施時は **NULL確認→ensure→backfill→0件確認→NOT NULL** の順を厳守した。完了済みの①②は再実行しない。
> 記号: ✅=完了 / 🟡=成功記録はあるが正式な再確認待ち / ⬜=未確認 / 🟢=GO条件 / 🛑=STOP（満たさなければ次へ進まない）

---


## 進捗（2026年7月25日）

| 項目 | 状態 | 確認根拠 |
|---|---|---|
| ① Trial P3 | ✅ **正式な本番実機再QA PASS（2026年8月12日05:45〜05:57 JST・Android実機）** | 訂正済み手順どおり本番URLで再QAを実施し、主要シナリオ全項目PASS（詳細は下記①手順内「2026年8月12日 本番実機再QA結果」参照）。メール確認（実メール受信）はBLOCKEDのため、Trial P3の合否とは切り離し「メール配信の宛先制限」の公開前必須ブロッカーとして別管理する |
| ② dream_profile_id安全化 | ✅ 完了済み | `backend/db/schema.rb` は `dream_profile_id, null: false`。2026年7月4日のNOT NULL migrationも反映済み |
| ③ Stripe通しテスト | ⬜ 未確認 | Stripeダッシュボードと購入画面での操作が必要 |
| README更新 | ✅ 完了済み | PR #444 マージ済み |
| Search Console登録 | ⬜ 未確認 | ユーザー操作が必要 |

> **（8/12更新）** ①は2026年8月12日に正式PASSで完了した。現在の次の運用タスクは **③ Stripeのテストモード通し確認**（ローカル/専用ステージング限定。詳細は下記「③-ローカル」参照）。②は完了済みのため、migrationやバックフィルを再実行しない。

---

## 鉄則

1. **②は完了済み。2-2〜2-5の操作系コマンドは再実行しない。** 状態を確かめる場合は、2-1の読み取り専用コマンドだけを使う。
2. 履歴上、再実行可能だったのは `ensure_self_profiles` / `backfill_dream_profile_id` の2タスクだけ。NOT NULL migrationは再実行しない。
3. **③ Stripe の購入(checkout)は、再実行すると実際の課金が二重発生しうる。** 通し確認はまず**テストモード**で行い、本番課金は必要な場合のみ1回に限定する。「不安だからもう一回」は絶対にしない。

---

## ① 本番 Trial P3 実機確認（スマホ実機）— ✅ 2026年8月12日 正式PASS

> 目的: trialユーザーとして`/home`からDB保存した夢が、`convert_trial`による本登録後も消えないことを確認する（PR #392の着地確認）。
>
> **過去**（〜2026年8月上旬）: `/trial`画面の「記録だけする」とAIプレビューの夢はReactの画面内stateだけで、DBには保存されず、再読み込みで消えていた。2026年7月22日・8月2日のTrial P3 QAは、この未保存問題によりいずれも無効化された。
>
> **現在**: [PR #473](https://github.com/isekaisaru/dreamjournal-app/pull/473)（commit `6febfd0`）で解決済み。「記録だけする」「AIにきいてみる」の両方が`createDream`を通じてDBへ保存されるようになった。両導線で`createDream`が呼ばれることを確認する回帰テストが`frontend/__tests__/app/trial/page.test.tsx`にある。
>
> **残存課題（別Issue候補・未対応）**: 保存済みの夢はDBに存在するが、`/trial`画面は既存の保存済み夢を再取得しないため、画面をリロードすると「記録した夢 (0/7)」のように件数が0に見える可能性がある。データは失われていないが表示が追いついていない。今回のP3手順（下記）でも、この表示問題を避けるため引き継ぎ確認用の夢は引き続き`/home`から記録する。

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

### 2026年8月12日 本番実機再QA結果 — ✅ PASS

- 実施日時: 2026-08-12 05:45〜05:57 JST
- 環境: 本番（`https://dreamjournal-app.vercel.app`）／Androidスマホ実機

主要シナリオ（すべてPASS）:
- [x] TrialBanner表示（本登録前）
- [x] 本登録前の夢（「猫の夢」）表示
- [x] Trial → 本登録
- [x] 本登録後も「猫の夢」が残る
- [x] TrialBanner消失
- [x] 本登録後のユーザー名表示
- [x] 夢詳細画面
- [x] 「もり」画面
- [x] 「設定」画面

メール確認（Trial P3とは別項目として切り出し）:
- [x] 本登録後、メール確認待ちバナー表示: PASS
- [x] 「確認メール送信済み」表示: PASS
- [ ] 実メール受信: **BLOCKED / 未確認**（原因候補: Resend独自ドメイン未検証のため、現行の送信先制限に該当している可能性が高い。詳細は本ファイルの「公開前必須チェック：メール配信ドメイン」を参照）

結論: **Trial P3主要シナリオは正式PASSとして扱う。** メール配信（実受信）はTrial P3の合否から切り離し、公開前必須のResend独自ドメイン対応ブロッカーとして別管理する。

### ①-補足：reload表示・7件上限・Premium例外・スマホ表示（2026年8月11日追加）

> 上のP3手順は「夢が残るか」の確認が中心。ここでは`/trial`のリロード時表示（[PR #488](https://github.com/isekaisaru/dreamjournal-app/pull/488)で修正済み）と、`TRIAL_DREAM_LIMIT = 7`（`backend/app/controllers/dreams_controller.rb`）まわりの回帰を、それぞれ「何を操作するか／期待結果／失敗時にどこを見るか」の形で確認する。すべて**ローカルDocker環境**または**本番の自分のtrialアカウント**のどちらで行ってもよいが、7件上限の確認は本番で実データを7件も作ることになるため、**ローカル環境での実施を推奨**する。

- [ ] **reload時のDB累計表示**
  - 操作: `/trial`で「記録だけする」またはAIプレビューを2〜3回行った後、ブラウザをリロードする
  - 期待結果: リロード後の件数表示が、リロード前に記録した件数と一致する（0/7に戻らない）
  - 失敗時に見るログ: ブラウザNetworkタブで`GET /dreams`が発行されているか、レスポンスの件数とUI表示が一致しているか。フロントのコンソールエラーも確認
- [ ] **7件上限**
  - 操作: ローカル環境のtrialアカウントで夢を7件作成した状態で、8件目を`/dream/new`から保存しようとする
  - 期待結果: `お試しで のこせる ゆめは 7こ までだよ。アカウント登録すると、ずっと のこせるよ。`というエラーメッセージが表示され、8件目は保存されない
  - 失敗時に見るログ: バックエンドの`POST /dreams`レスポンスstatus（422期待）、Railsログの`check_trial_dream_limit`周辺、`current_user.dreams.count`の実値
- [ ] **Premium trialユーザーの例外**
  - 操作: trialユーザーをローカルDBで`premium: true`にした状態（`User.find_by(email: "...").update!(premium: true)`、**本番DBでは行わない**）で、8件目以降の夢を保存する
  - 期待結果: 7件上限に関係なく保存できる（`dreams_controller.rb`の`check_trial_dream_limit`は`current_user.premium?`が真なら即returnする実装のため）
  - 失敗時に見るログ: 上と同様。加えて`current_user.premium?`が意図通りtrueになっているか（`ApplicationController`のcurrent_user解決ログ、または`rails runner`での直接確認）
- [ ] **スマホ表示（`/trial`・`/home`）**
  - 操作: ブラウザの幅を375px（またはスマホ実機）にして、`/trial`の入力フォーム・AI分析結果カード・`/home`のTrialBanner・夢一覧を一通り表示する
  - 期待結果: テキストの折り返し崩れ・ボタンの見切れ・タップ領域の重なりがない（[PR #487](https://github.com/isekaisaru/dreamjournal-app/pull/487)の`/forest`ナビ折り返し修正と同種の崩れがないか、という観点）
  - 失敗時に見るログ: 崩れが起きたページ・幅・要素をスクリーンショットで記録（ログではなく見た目の確認のため）

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

## ③-ローカル Stripe テストモード通し確認（2026年8月11日追加・現在の推奨手順）

> 8月計画（Must②）の方針として、Stripe通し確認は**ローカル/専用ステージング環境限定**で行い、**本番のStripe関連環境変数は一切変更しない**ことになっている。下の元の「③ Stripe 本番フロー通しテスト」は本番URLを使う手順のため、**現時点ではこのローカル版を使う**。本番モードでの実購入は8月計画に含めない。
>
> 目的・確認ルートは元の③と同じ（購入→Webhook→premium反映→Portal）。差分は「本番URLではなくローカルDocker環境で、Stripeのtestキー・test Price IDを使う」こと。

準備:
- [ ] リポジトリルートで throwaway 用の `docker-compose.yml` のポートを既存の常駐スタック（3000/3001/5432）と衝突しないよう一時的にずらす（作業後は`git checkout --`で戻す）
  - ⚠️ **ポートをずらしたら、`docker-compose.yml`内の`NEXT_PUBLIC_API_URL`（デフォルト`http://localhost:3001`）・`INTERNAL_API_URL`、および`backend/.env`の`FRONTEND_URL`（デフォルト`http://localhost:3000`）も、ずらした後のポートに合わせて必ず変更する。ここを揃えないと、ブラウザからのAPIリクエストや決済後のリダイレクトが常駐スタック側に向いてしまい、認証やセッションの検証が壊れる、または常駐スタックの方を誤って確認してしまう**
- [ ] `backend/.env`にStripeの**testキー**（`STRIPE_SECRET_KEY`が`sk_test_`始まり、`STRIPE_PUBLISHABLE_KEY`が`pk_test_`始まり）と`STRIPE_PREMIUM_PRICE_ID`（testモードのPrice ID）を設定
- [ ] 別ターミナルで `stripe listen --forward-to localhost:<ずらした後のローカルbackendポート>/webhooks/stripe` を起動し、表示された`whsec_...`をローカルの`STRIPE_WEBHOOK_SECRET`に設定（`docs/runbook-payments.md`の「手動検証コマンド」参照）
- [ ] 接続先DBがローカルの開発/テスト用DBであり、本番DBでないことを値を表示せず確認する
- [ ] **チェックアウト可能なテストユーザーを用意する**: `CheckoutController#create`は`require_verified_email`（`ApplicationController`）を通るため、新規登録しただけ・seedの一般ユーザーは`email_verified_at`が未設定で403になる。以下のどちらかで用意する
  - trialユーザーとして`/trial`からログインする（`require_verified_email`はtrialユーザーを対象外にしている）
  - 通常のテストユーザーで`bundle exec rails runner 'User.find_by(email: "...").update!(email_verified_at: Time.current)'`によりローカルDBだけで確認済み扱いにする（**本番DBでは絶対に行わない**）

手順:
- [ ] 上記で用意したテストユーザーで、ローカルで起動したフロントエンド（ポートを揃えた`http://localhost:<ポート>`）にログインする
- [ ] **サブスク/課金画面**から「プレミアム」購入 → Stripe Checkout へ遷移
  - 期待結果: `POST /checkout`が200を返し、Stripe Checkoutページへリダイレクトされる
  - 失敗時に見るログ: 403の場合はテストユーザーが未確認（上記「チェックアウト可能なテストユーザー」を参照）。500系の場合はバックエンドログの`checkout.error.*`系KPI（`docs/runbook-payments.md`参照）、`FRONTEND_URL`/`STRIPE_PREMIUM_PRICE_ID`の設定漏れ
- [ ] テストカード `4242 4242 4242 4242` / 任意の未来日 / 任意CVC で決済
- [ ] `stripe listen`のターミナルで`checkout.session.completed`が転送され、ローカルbackendが**200**を返していることを確認
  - 失敗時に見るログ: `stripe listen`の出力（署名エラー・接続エラー）、バックエンドログの`webhook.error.*`系KPI
- [ ] アプリに戻り、**user.premium が true** になっていること
  - 確認: ローカルのRailsコンソール/`rails runner`で `User.find_by(email: "<テストユーザーのメール>")&.premium` を確認
  - 失敗時に見るログ: `webhook.subscription.started`ログ、`Subscription`テーブルの該当行（`stripe_subscription_id`・`status`）
- [ ] 課金画面から **顧客ポータル(billing_portal)** を開けること
- [ ] （任意）ポータルで解約 → `stripe listen`で`customer.subscription.deleted`が200 → premiumがfalseに戻ることを確認

🛑 Webhookが200にならない/premiumが反映されない場合、または**ローカル/専用ステージング環境そのものを用意できない場合**は、Stripe通し確認は「未完了」のまま記録してSTOPする。本番環境で代替確認せず、原因を切り分けてから再度ローカルで試みる。

---

## ③ Stripe 本番フロー通しテスト

> ⚠️ **8月計画では現在このセクションは対象外**（上の「③-ローカル」を参照）。本番モードでの実購入は8月Mustに含めないという方針のため、当面はローカル版のみを使う。将来、本番での最終確認が必要になった場合のための手順として残してある。
>
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

## 公開前必須チェック：メール配信ドメイン（2026年8月4日追加）

> 背景: Renderの`MAIL_FROM`が`YumeTree <onboarding@resend.dev>`のまま。Resendの`resend.dev`はテスト用ドメインで、**Resendアカウントに紐づくメールアドレスとは別のアドレス**へは、独自ドメインの追加・認証なしには送信できない（Resend公式ドキュメントに明記）。この状態では、新規に本登録した一般ユーザーはメール確認が完了せず、AI夢分析・分析プレビュー・画像生成・音声夢記録・Stripe Checkoutも利用できない（`require_verified_email`ガード。Trialユーザーと既存ユーザーは対象外）。公開判断は、下記の必須チェックをすべて満たした後に行う。

- [ ] YumeTree用の独自ドメインを取得した（**未取得。取得先・ドメイン名は未定**）
- [ ] Resendにそのドメイン（またはメール専用サブドメイン）を追加した
- [ ] Resend画面に表示されたDNSレコードを、取得先のDNS設定へ**そのまま**（推測せず）登録した
- [ ] Resendで**Verified**になったことを確認した
- [ ] Renderの`MAIL_FROM`を検証済みドメインのアドレスへ変更した（例：`YumeTree <no-reply@mail.取得ドメイン>`）
- [ ] **Resendアカウントに紐づくメールアドレスとは別のアドレス**で新規本登録し、確認メールが届いた
- [ ] 同アドレスでパスワードリセットメールも届いた
- [ ] メール内リンクから確認・再設定まで完走できた
- [ ] Resendのメールログで、確認メール・パスワードリセットメールがともに**Delivered**であることを確認した
- [ ] Sentryに`MailDeliveryJob`関連の新規エラーが出ていない

🛑 上記が**すべて**チェックできるまで、一般公開はしない。

---

## 完了後（KPI更新）

7月OBLのKPI:
- [x] Trial P3 本番QA完了（2026年8月12日、①の訂正済み手順で正式再QA・PASS。詳細は①の「2026年8月12日 本番実機再QA結果」参照）
- [x] `dream_profile_id` NULL 0件
- [x] NOT NULL migration 完了
- [ ] Stripeテストモード通し確認成功
- [ ] 必要な場合のみ、Stripe本番フローを1回成功
- [x] README更新（PR #444）
- [ ] Search Console 登録（SEO土台は #393 で反映済み）

> 次は①の再QAを訂正済み手順で行い、通ったら③を上から1項目ずつ進める。詰まった場合は、①なら再現手順・発生時刻・夢のタイトルを、③ならStripeのイベント名・HTTPステータス・発生時刻をそのまま共有する。
