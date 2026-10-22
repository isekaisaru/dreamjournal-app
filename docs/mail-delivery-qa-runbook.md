# 一般ユーザー向けメール：実受信QAランブック

目的は「コードがある」から「所有者以外の試験利用者がメールを受け取り、リンクを使える」へ進むこと。この文書と自動テストの追加だけでは、配信・QA・production完了とはしない。

## 証拠と権限の境界

- コード / テストPASS / branch push / PR / main / QA実操作 / production実測を別々に記録する。
- 初期状態はすべての外部・実地確認が **未確認**。昔のrunbookに記載された送信元やドメイン状態を現在の事実として使わない。
- 手順の存在は実行許可ではない。環境・試験アカウント・送信先の所有者の同意・操作範囲を人間が承認してから実施する。
- DNS / Render / Resend設定変更、production DB操作、migration、deploy、Stripe操作、secret表示は本手順で行わない。必要ならSTOPして別承認へ切り出す。
- 実際の宛先、本文、token付きURL、password、Cookie、SMTP認証値は公開GitHub・CIログへ載せない。実測記録は個人用の非公開ファイルへ残す。

2026-10-10のPR再検証基準はmain `27dfd9937b00b853e518867c7efa5b83ce9fb6a5`（Next.js 16.3.8、#508のpassword reset有効期限表記修正を含む）。これはコード基準であり、frontend / backendのproduction稼働SHAを示す証拠ではない。

| 証拠区分 | 判定 |
|---|---|
| code | PASS / FAIL / 未確認 |
| local tests | PASS / FAIL / 未確認 |
| GitHub CI | PASS / FAIL / 未確認 |
| Preview | PASS / FAIL / 未確認 |
| main merge | PASS / FAIL / 未確認 |
| production runtime | PASS / FAIL / 未確認 |
| real email send | PASS / FAIL / 未確認 |
| inbox receipt | PASS / FAIL / 未確認 |
| Resend Delivered | PASS / FAIL / 未確認 |
| real verification/reset link usage | PASS / FAIL / 未確認 |
| login after reset | PASS / FAIL / 未確認 |
| verified-user feature unlock | PASS / FAIL / 未確認 |

## 1. 最初のGO確認（読み取りのみ）

| 確認 | 記録する内容 | 初期状態 |
|---|---|---|
| 対象環境 | frontend / backendの環境名と対象SHA。main SHAと稼働SHAは別欄 | 未確認 |
| 試験アカウント | 所有者以外の同意済み宛先を非公開の別名で識別。新規本登録・未確認ユーザー | 未確認 |
| 既存アカウントとの差 | Trialとmigrationで確認済みの既存ユーザーは検証ゲートの対象外なので、このQAの代わりにしない | 未確認 |
| 配信ドメイン | Resendの現時点のVerified状態と送信元ドメインの一致を確認。秘密値をコピーしない | 未確認 |
| 配信設定 | 必須3キー SMTP_USERNAME / SMTP_PASSWORD / MAIL_FROM の存在、FRONTEND_URLの対象環境一致。SMTP_ADDRESS / SMTP_PORT は未設定でも既定値で動くため、設定している場合だけ意図した値かを確認する。値は記録・表示しない | 未確認 |
| 起動時警告 | backend起動ログに `component: mail_delivery` の warn が出ていないか。出ていれば `missing_keys` のキー名だけ記録する | 未確認 |
| 外部操作範囲 | 登録・確認メール・再設定メール・password更新に対する明示承認。生成・決済の費用/副作用は別承認 | 未確認 |

YumeTreeのmainにあるproduction環境向けコードはRails Action MailerからSMTP配信する。実際に稼働中のSHA・設定は別途確認する。

コード上の設定の扱い（main `7673be0d` 時点）:

- 起動時の不足チェックが必須とするのは `SMTP_USERNAME` / `SMTP_PASSWORD` / `MAIL_FROM` の3キーだけ（`backend/lib/mail_delivery_config.rb:15`）。不足時はproduction起動時に `component: mail_delivery` の warn をキー名だけ出す（`backend/config/initializers/mail_delivery_safety.rb:21-31`）。起動は止まらない。
- `SMTP_ADDRESS` / `SMTP_PORT` は既定値 `smtp.resend.com` / `465` を持つ（`backend/config/environments/production.rb:85-92`）。未設定は異常ではない。
- `MAIL_FROM` 未設定時の送信元は `support@yumelog.com` にフォールバックする（`backend/app/mailers/application_mailer.rb:6`）。警告は出るが送信は試みられる。
- **`FRONTEND_URL` は起動時警告の対象外**。未設定だとメール内リンクは警告なしで `http://localhost:8000` を指す（`backend/app/mailers/user_mailer.rb:9`, `:20`）。そのため設定の存在確認だけでは足りず、受信したメールのリンクのホストが対象環境のfrontendであることを実メールで確認する（Phase 1・2の手順を参照）。

登録や再設定リクエストのHTTP 200、画面の「送ったよ」、Railsの配信ログだけで、メールが届いたと判定しない。

Resendの共有テストドメインは所有者宛に制限される。一般ユーザーへの配信には検証済み独自ドメインが必要。[Resend公式の制限説明](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)、[Verified domains](https://resend.com/docs/dashboard/domains/introduction)。この文書作成時点の実アカウント設定は未確認。

## 2. 確認メール：一段ずつ記録する

この節をPhase 1として独立判定する。途中で異常があればPhase 1でSTOPし、Phase 2・3へ進まない。

1. GO条件が揃った環境で、同意済みの試験利用者が新規本登録する。確認待ちバナーの表示と登録結果を記録する。
2. 確認メールの発行時刻を記録する。自動送信があるため、不安を理由に再送を連打しない。
3. 所有者以外の受信箱でメールを確認し、実受信時刻と受信箱/迷惑メールのどちらかを記録する。宛先や本文は公開しない。
4. Resendの同じメールのイベントを、時刻・種別・宛先別名で照合する。**Deliveredは受信側メールサーバーへの到達であり、受信箱への表示とは別証拠**。[Resendのメール状態](https://resend.com/docs/dashboard/emails/manage-emails)。メール本文を公開するShare email機能は使わない。
5. リンクを開く前に、本人がリンク先の**ホスト**が対象環境のfrontendであることを確認する（`localhost` や別環境なら `FRONTEND_URL` の不備を疑いSTOP）。記録するのはホストの一致/不一致だけで、URL全体やtokenは記録しない。
6. 受信した実メールのリンクを本人が開き、`/verify-email`の結果と対象環境が正しいことを確認する。token付きURLをコピー・共有しない。
7. ホームへ進み、確認待ちバナーと確認状態の更新を記録する。これだけでAI・画像・音声・Checkoutの機能解放までPASSにしない。

**STOP**：未着、Deliveredとの照合不一致、別環境へのリンク、同意していない宛先、token露出、既存利用者への影響が疑われる場合。再送・設定変更を重ねず、時刻と秘匿済みの症状だけ記録する。

## 3. パスワード再設定：確認メールとは別に記録する

この節をPhase 2として独立判定する。途中で異常があればPhase 2でSTOPし、Phase 3へ進まない。

1. 同じ承認済み試験アカウントで`/forgot-password`からリセットを1回要求する。
2. 画面の成功案内、実メール受信、Resend Deliveredをそれぞれ記録する。存在しないユーザーでも同じHTTP成功案内を返す設計なので、成功表示をアカウント存在や配信完了の証拠にしない。
3. 本人が実メールの`/password-reset/...`リンクのホストが対象環境のfrontendであることを確認してから（確認メールと同じく `FRONTEND_URL` 由来で、警告対象外）、試験アカウントのpasswordを再設定する。実passwordを記録しない。
4. 本人が新passwordでログインできることを確認する。試験利用者以外のアカウントや既存sessionを使わない。
5. 無効/期限切れ/使用済みリンクの扱いは既存のローカルテスト証拠と分ける。実地で再利用まで試す場合も承認範囲と同じ試験アカウントに限定する。

現行`User`実装の有効期間は、メール確認24時間、再設定60分、確認メールの再送間隔5分。古い本文の表記を正とせず、未merge修正は別に扱う（#508は2026-10-10時点でmain入り済み）。期限の境界はローカルテストで確認し、production DBの時刻を書き換えない。

## 4. メール確認前後の機能解放

この節をPhase 3として独立判定する。AI、画像、音声、Checkoutはそれぞれ別欄に記録し、未承認または異常のある項目ではその場でSTOPする。

対象は **新規本登録の非Trialユーザー**。現在のbackendは未確認ユーザーに`403 + email_verification_required: true`を返す。

| 対象 | 現行ゲートの位置 | 確認前 | 確認後 |
|---|---|---|---|
| AI分析 / 分析プレビュー | DreamsController `analyze` / `preview_analysis` | 未確認 | 未確認 |
| 画像生成 | DreamsController `generate_image` | 未確認 | 未確認 |
| 音声夢記録 | AudioDreamsController `create` | 未確認 | 未確認 |
| Checkout | CheckoutController `create` | 未確認 | 未確認 |

ゲートの根拠: `backend/app/controllers/dreams_controller.rb:6`、`audio_dreams_controller.rb:5`、`checkout_controller.rb:10`、判定本体は `application_controller.rb:96-104`（Trialユーザーは対象外: `:97`）。

**メール確認ガードの対象外**（未確認ユーザーでも403にならない。上の表の「確認前」で拒否されないのは仕様どおり）:

- 月次AIサマリー（`MonthlySummariesController#create`）: premium会員かどうかだけを確認する（`backend/app/controllers/monthly_summaries_controller.rb:5-8`）。
- Billing Portal（`BillingPortalController#create`）: premium会員と `stripe_customer_id` の有無だけを確認する（`backend/app/controllers/billing_portal_controller.rb:2-9`）。

**Checkoutの403は画面の文言では判別できない**: 寄付ページ・サブスクページは、メール未確認の403でも「決済ページの準備に失敗しました。」の汎用文言を出し、メール確認が必要とは案内しない（`frontend/app/donation/page.tsx:18-20`、`frontend/app/subscription/page.tsx:70-72`）。Checkoutゲートの判定は、Networkタブで `/api/checkout` が `403` かつ本文に `email_verification_required: true` を含むかで行い、画面表示だけで「ゲートが効いた」と記録しない。

- バナー非表示、mock API成功、userの確認状態、実際の機能操作は別々の証拠。
- APIの拒否が消えても、別の利用上限・課金・権限エラーが起きる可能性がある。結果を省略せず記録する。
- AI/画像/音声の外部費用・データ保存が伴う操作は、対象と上限を別途承認する。未承認ならこの表を未確認のまま残す。
- Checkoutの検証は承認済みの隔離Stripe test-mode QAに委譲する。メールQAのためにproduction Checkoutを作らない。現在の[決済runbook](runbook-payments.md)を読み、曖昧なら再POSTしない。
- DBで`email_verified_at`を書き換えたりdev token endpointを使ったりして、実メール確認の証拠を作らない。

## 5. 自動テストが保証する範囲

| テスト | 対象 | 保証しないこと |
|---|---|---|
| `backend/spec/requests/email_verification_spec.rb` | token有効/無効/期限切れ、再送間隔、登録時のジョブ、Checkoutゲート | SMTP・Resend・実受信・productionの完了 |
| `backend/spec/requests/password_resets_spec.rb` | リセットAPIとtokenの扱い | 実受信・送信元設定・本人のログイン実操作 |
| `backend/spec/lib/mail_delivery_config_spec.rb` / `mailer_log_level_spec.rb` | 設定不足の検出・ログの安全性 | 実設定が揃っていること・外部配信 |
| `frontend/e2e/email-verification-flow.spec.ts` | mock応答に対する確認リンクの画面・ホーム復帰・再送cooldown | backendによるtoken検証・実メール送信・全機能の解放 |
| `frontend/e2e/password-reset-flow.spec.ts` | mock応答に対する再設定フォームの案内 | 本人の実メールリンク・実password変更 |

CIで新しいE2EがPASSしても、上の実地項目は自動でチェックしない。security / auth / payment / production DB / migration / secretsは「80% first」で公開しない。

## 6. 非公開の実測記録テンプレート

```text
実施日時（timezone）:
操作者・承認記録:
環境名:
main SHA:
frontend production SHA: PASS / FAIL / 未確認
backend production SHA: PASS / FAIL / 未確認
試験アカウント別名（実アドレスは非公開）:
送信ドメインVerifiedと環境一致: PASS / FAIL / 未確認
SMTP_USERNAME存在（必須）: PASS / FAIL / 未確認
SMTP_PASSWORD存在（必須）: PASS / FAIL / 未確認
MAIL_FROM存在（必須）・ドメイン一致: PASS / FAIL / 未確認
SMTP_ADDRESS / SMTP_PORT（任意・未設定なら既定値）: 既定値 / 設定あり・意図どおり / 未確認
起動ログに mail_delivery の warn なし: PASS / FAIL / 未確認
FRONTEND_URL環境一致: PASS / FAIL / 未確認
メール内リンクのホストが対象環境のfrontend（確認メール / 再設定メール）: PASS / FAIL / 未確認
確認メール: 発行 / 実受信 / Delivered / 実リンク結果を別記
再設定メール: 発行 / 実受信 / Delivered / password更新 / ログインを別記
機能解放: AI / preview / 画像 / 音声 / Checkoutを別記
STOPした箇所:
次の最小1アクション:
```

公開するのは秘匿済みの判定・対象環境・SHA・時刻だけ。token、reset URL、password、Cookie、秘密値、個人のメール本文・実アドレスは含めない。

## コードの照合先

- `backend/config/environments/production.rb` / `backend/app/mailers/application_mailer.rb` / `backend/app/mailers/user_mailer.rb`
- `backend/lib/mail_delivery_config.rb` / `backend/config/initializers/mail_delivery_safety.rb`
- `backend/app/models/user.rb` / `backend/app/controllers/password_resets_controller.rb`
- `backend/app/controllers/application_controller.rb` / `dreams_controller.rb` / `audio_dreams_controller.rb` / `checkout_controller.rb`
- ガード対象外: `backend/app/controllers/monthly_summaries_controller.rb` / `billing_portal_controller.rb`
- `frontend/app/verify-email/page.tsx` / `frontend/app/components/EmailVerificationBanner.tsx`
- Checkout失敗時の画面文言: `frontend/app/donation/page.tsx` / `frontend/app/subscription/page.tsx`

この文書は旧[守りのMust runbook](2026-07-guard-must-runbook.md)のメール公開ブロッカーを、現在の証拠境界と実装に合わせて補足する。古い外部設定の記述・本番操作の手順を今回の承認へ読み替えない。
