# 本番決済前チェックリスト

本番Stripe決済を開始する前に、このリストをすべて確認する。
急がない。すべてのチェックが通るまで `STRIPE_PREMIUM_PRICE_ID` を本番Renderに入れない。

---

## 1. テスト環境での動作確認

### 1-1. 590円プレミアム購読

- [ ] Stripeテストモードで590円のCheckout Sessionが正常に作成される
- [ ] Stripeテストカード（`4242 4242 4242 4242`）で決済が完了する
- [ ] 決済成功後、ユーザーの `premium` フラグが `true` になる
- [ ] 決済成功後、`subscriptions` テーブルにレコードが作成される（`status: active`）
- [ ] `/subscription/success` ページが正常に表示される

### 1-2. 解約導線

- [ ] ビリングポータルへのリンク（解約ボタン）がUIに存在する
- [ ] ビリングポータルから解約操作が完了する
- [ ] 解約後、Webhookの `customer.subscription.deleted` が受信される
- [ ] 解約後、ユーザーの `premium` フラグが `false` になる
- [ ] 解約後、`subscriptions` テーブルの `status` が `canceled` になる

### 1-3. フェアユース制限

- [ ] AI分析（夢分析）：プレミアムで1日50回の制限が正しく動作する
- [ ] AI分析（夢分析）：制限超過時に適切なエラーメッセージが表示される
- [ ] 月次サマリー：月3回の制限が正しく動作する
- [ ] 月次サマリー：制限超過時に適切なエラーメッセージが表示される

### 1-4. 画像生成

- [ ] 画像生成：月31枚制限が正しく動作する
- [ ] 画像生成：`quality` パラメータが `"medium"` 固定であることをコードで確認
  - 確認箇所: `backend/app/controllers/dreams_controller.rb` の `generate_image`
- [ ] 画像生成：制限超過時に適切なエラーメッセージが表示される

---

## 2. ビジネス・法的確認

### 2-1. 利用規約・プライバシーポリシー

- [ ] 利用規約ページが存在し、公開されている
- [ ] プライバシーポリシーページが存在し、公開されている
- [ ] 両ページへのリンクがサービス内（フッター等）に設置されている
- [ ] 利用規約に「サブスクリプション（月額課金）」の説明が含まれている
- [ ] プライバシーポリシーにStripeへのデータ提供が記載されている

### 2-2. 特定商取引法表記

- [ ] 特定商取引法に基づく表記ページが存在し、公開されている
- [ ] 以下の項目がすべて記載されている：
  - [ ] 販売事業者名（屋号または氏名）
  - [ ] 所在地
  - [ ] 連絡先メールアドレス
  - [ ] 販売価格（590円／月、税込）
  - [ ] 支払方法（クレジットカード）
  - [ ] 支払時期（毎月課金）
  - [ ] サービス提供時期
  - [ ] 返品・キャンセルポリシー（サブスクリプションの解約方法）

### 2-3. 問い合わせ先

- [ ] ユーザーが問い合わせできるメールアドレス、またはフォームが設置されている
- [ ] 問い合わせ先が特定商取引法表記ページに記載されている
- [ ] 決済・サブスクリプションに関する問い合わせに対応できる体制がある

---

## 3. 本番Render設定前の確認事項

`STRIPE_PREMIUM_PRICE_ID` を本番Renderに設定する前に、以下を確認する。

- [ ] 本番Stripeダッシュボードで590円の月額価格（Price）が作成済みである
- [ ] 作成した本番Price IDが `price_` で始まる本番用IDである（テスト用 `price_test_` ではない）
- [ ] 本番Stripeの `STRIPE_SECRET_KEY` が `sk_live_` で始まることを確認（値は確認するが絶対にログや画面に出力しない）
- [ ] 本番Stripeの `STRIPE_WEBHOOK_SECRET` が本番エンドポイント用のものであることを確認
- [ ] RenderのWebhookエンドポイントURL（`https://dreamjournal-app.onrender.com/webhooks/stripe`）がStripeダッシュボードに登録されている
- [ ] Webhookが購読するイベントを確認：
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `customer.subscription.deleted`
- [ ] `FRONTEND_URL` が `https://dreamjournal-app.vercel.app` に設定されている
- [ ] テストモードのキーが本番環境に入っていないことを確認

---

## 4. 本番決済開始後の監視項目

開始後24〜48時間は以下を監視する。

### 4-1. Renderログ

- [ ] `[PaymentsKPI] checkout.session.created` が出力されている
- [ ] `[PaymentsKPI] webhook.payment.saved` または `webhook.subscription.started` が出力されている
- [ ] `500 Internal Server Error` が決済フロー内で発生していない
- [ ] `[Webhook] Signature verification failed` が出ていない（偽リクエストの可能性）

### 4-2. Stripeダッシュボード

- [ ] テストモードではなく本番モードで確認している
- [ ] 決済一覧に実際の購読レコードが表示されている
- [ ] Webhookイベントのステータスが `200` で成功している
- [ ] 失敗したWebhookイベントがない

### 4-3. データベース

- [ ] `subscriptions` テーブルに本番の `stripe_subscription_id` が存在する
- [ ] 該当ユーザーの `premium` フラグが `true` になっている
- [ ] `processed_webhook_events` に重複なくイベントが記録されている

---

## 5. 本番決済開始の判断基準

以下の**すべて**を満たしたときに本番開始とする。満たさない場合は開始しない。

| 項目 | 基準 |
|------|------|
| テスト環境での動作 | セクション1の全項目にチェックが入っている |
| 法的ページ | 利用規約・プライバシーポリシー・特商法表記がすべて公開済み |
| 問い合わせ対応 | 問い合わせ先が設置されており、対応できる状態 |
| Render設定 | セクション3の全項目にチェックが入っている |
| 精神的準備 | 「本番で何か起きても、runbook-payments.mdを見れば対応できる」と思える |

---

## 参照ドキュメント

- [docs/runbook-payments.md](runbook-payments.md) — 決済障害時の一次対応手順
- [docs/release-checklist-payments.md](release-checklist-payments.md) — リリース前の技術チェック
- [docs/payment-flow.md](payment-flow.md) — 決済フローの設計図
