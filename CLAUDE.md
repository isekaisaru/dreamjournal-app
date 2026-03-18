# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Snapshot

ユメログは、夢の記録・AI分析・寄付決済を提供する本番運用中のフルスタックアプリです。

- Frontend: Next.js 16 / React 18 / TypeScript / Tailwind CSS
- Backend: Ruby on Rails 7.1 API mode / Ruby 3.3
- Database: PostgreSQL
- Auth: JWT + HttpOnly Cookie
- Payment: Stripe Checkout + Stripe Webhook
- Monitoring: Sentry + structured payment logs
- Infra: Vercel (frontend) / Render (backend)

## Production Ready URLs

- Frontend: `https://dreamjournal-app.vercel.app`
- Backend API: `https://dreamjournal-app.onrender.com`

本番ではフロントとバックが別ドメインです。クロスドメイン前提で Cookie, CORS, redirect URL を壊さないこと。

## Repo Map

- `frontend/`: Next.js App Router
- `backend/`: Rails API
- `docs/runbook-payments.md`: 決済障害対応の一次 runbook
- `frontend/app/api/checkout/route.ts`: frontend 側の checkout 中継
- `frontend/app/api/checkout/backend-url.ts`: Vercel/ローカルでの backend URL 解決
- `backend/app/controllers/checkout_controller.rb`: Stripe Checkout Session 作成
- `backend/app/controllers/webhooks_controller.rb`: Stripe Webhook 受信と payment 永続化

## Local Commands

### Frontend

```bash
cd frontend
yarn dev
yarn build
yarn test
yarn e2e
```

### Backend

```bash
cd backend
bundle exec rails server
bundle exec rspec
bundle exec rails console
```

### Docker / Make

```bash
make dev-up
make dev-down
make dev-logs
make health
```

## Core Architecture

### Authentication

- JWT is stored in HttpOnly cookies.
- Frontend sends authenticated requests through the App Router / route handlers.
- Backend authorization is enforced in `ApplicationController`.

### Dream Analysis

- Dream analysis uses OpenAI from the Rails backend.
- Production must have `OPENAI_API_KEY`; `backend/config/initializers/openai.rb` raises in production if missing.

### Payment Flow

寄付決済は production で成功済みのため、この経路は慎重に扱うこと。

1. Browser calls `POST /api/checkout` on the Next.js app.
2. `frontend/app/api/checkout/route.ts` forwards the request to Rails `POST /checkout` with the user's Cookie.
3. `CheckoutController#create` validates `FRONTEND_URL`, ensures/reuses a Stripe customer, and creates a Stripe Checkout Session using `STRIPE_SECRET_KEY`.
4. Stripe redirects the user back to `${FRONTEND_URL}/donation/success` or `/donation/cancel`.
5. Stripe sends `checkout.session.completed` to `POST /webhooks/stripe`.
6. `WebhooksController#stripe` verifies the signature with `STRIPE_WEBHOOK_SECRET`, deduplicates the event, resolves the user, and persists a `Payment`.

補足:

- `client_reference_id` に user id を入れて user 解決の主経路にしている。
- `stripe_customer_id` と email でもフォールバック解決する。
- 決済の observability は `PaymentsObservability` と `[PaymentsKPI]` ログで追う。
- 障害対応は `docs/runbook-payments.md` を最優先で参照する。

## Critical Environment Variables

### Frontend

- `NEXT_PUBLIC_API_URL`: 公開 backend URL。Vercel production では public URL を使う。
- `INTERNAL_API_URL`: 非 Vercel / ローカル用の backend URL 候補。

### Backend

- `FRONTEND_URL`: Stripe success/cancel redirect のベース URL。絶対 URL 必須。
- `STRIPE_SECRET_KEY`: Checkout Session 作成に必須。
- `STRIPE_WEBHOOK_SECRET`: `/webhooks/stripe` の署名検証に必須。
- `JWT_SECRET_KEY`: 認証トークン署名キー。
- `OPENAI_API_KEY`: AI分析用。
- `RAILS_MASTER_KEY`: production boot に必須。

重要:

- 秘密情報の値はログに出さない。
- 環境変数の確認が必要なら、値そのものではなく `present?` / `blank?` のみを出す。
- Stripe secret, JWT secret, OpenAI key, master key は絶対にレスポンスやログへ露出しない。

## Working Rules For AI Collaboration

- まず既存コードと関連 docs を読む。推測で決済や認証を触らない。
- 最小差分を優先する。特に決済・認証・環境変数まわりは不要なリファクタを避ける。
- Payment flow を変更したら、関連テストと `docs/runbook-payments.md` の整合性を確認する。
- Frontend と backend の URL 解決ロジックを同時に壊さない。Vercel production と local dev で条件分岐が異なる。
- 監視しやすい構造化ログは維持するが、秘密情報は出さない。
- 既存の production 成功フローを尊重し、変更理由が明確なときだけ touch する。
- ドキュメント更新時は「現行実装と一致しているか」を最優先にする。理想論より実装準拠。

## When Touching Payments

- `backend/spec/requests/checkout_spec.rb`
- `backend/spec/requests/webhooks_spec.rb`
- `frontend/__tests__/app/api/checkout/backend-url.test.ts`
- `docs/runbook-payments.md`

この4点はセットで確認すること。checkout と webhook のどちらか片方だけ直して終わりにしない。
