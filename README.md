# ユメログ — AI Dream Journal

> **毎朝の夢を、AIが分析・言語化してくれるセルフケア日記アプリ**
> *An AI-powered dream journal that captures, analyzes, and visualizes your inner world.*

[![E2E Tests](https://github.com/isekaisaru/dream-journal-app/actions/workflows/e2e-test.yml/badge.svg)](https://github.com/isekaisaru/dream-journal-app/actions/workflows/e2e-test.yml)
[![Backend Tests](https://github.com/isekaisaru/dream-journal-app/actions/workflows/backend-test.yml/badge.svg)](https://github.com/isekaisaru/dream-journal-app/actions/workflows/backend-test.yml)
[![Coverage](https://img.shields.io/badge/coverage-SimpleCov-brightgreen)](https://github.com/isekaisaru/dream-journal-app/actions/workflows/backend-test.yml)
[![Production](https://img.shields.io/badge/status-production%20ready-success)](https://dreamjournal-app.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**🌐 本番URL:** https://dreamjournal-app.vercel.app

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [CI/CD](#cicd)
- [Author](#author)

---

## Tech Stack

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?logo=framer)

### Backend
![Ruby on Rails](https://img.shields.io/badge/Rails-7.1_API-CC0000?logo=ruby-on-rails)
![Ruby](https://img.shields.io/badge/Ruby-3.3-CC342D?logo=ruby)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-336791?logo=postgresql)

### AI / Payment / Monitoring
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?logo=openai)
![Stripe](https://img.shields.io/badge/Stripe-Checkout_%2B_Webhook-008CDD?logo=stripe)
![Sentry](https://img.shields.io/badge/Sentry-Frontend_%2B_Backend-362D59?logo=sentry)

### Infrastructure / DevOps
![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?logo=vercel)
![Render](https://img.shields.io/badge/Render-Backend_API-46E3B7?logo=render)
![Docker](https://img.shields.io/badge/Docker_Compose-Local_Dev-2496ED?logo=docker)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?logo=github-actions)

### Testing
![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4b?logo=playwright)
![RSpec](https://img.shields.io/badge/RSpec-6.1-CC0000?logo=ruby)
![Jest](https://img.shields.io/badge/Jest-30-C21325?logo=jest)
![SimpleCov](https://img.shields.io/badge/SimpleCov-Coverage-brightgreen)

---

## Features

### 夢の記録 — Dream Logging
テキストで夢を記録し、感情タグを付けて保存。キーワード・日付・タグによる絞り込み検索と月別アーカイブに対応。

> 📸 *Screenshot placeholder — `docs/screenshots/dream-log.png`*

---

### AI分析 — AI Dream Analysis
OpenAI GPT-4 が夢の本文を分析し、テキスト要約・感情ラベルを自動生成。隠れた感情パターンを可視化するセルフケアツールとして機能。

> 📸 *Screenshot placeholder — `docs/screenshots/ai-analysis.png`*

---

### 認証 — JWT + HttpOnly Cookie Auth
メール登録・ログイン・ログアウト・パスワードリセットをサポート。JWT トークンは HttpOnly Cookie に格納し、XSS 経由のトークン漏洩を防止。

> 📸 *Screenshot placeholder — `docs/screenshots/auth.png`*

---

### 決済 — Stripe Checkout / Webhook
アプリへの寄付機能を Stripe Checkout で実装。Webhook 署名検証・冪等処理・`client_reference_id` によるユーザー照合など、本番グレードの堅牢な決済フローを構築。本番環境での決済完了を確認済み。

> 📸 *Screenshot placeholder — `docs/screenshots/donation.png`*

---

### テスト整備 — Testing
- **Playwright E2E:** smoke テストと寄付フローをブラウザ自動テストでカバー
- **RSpec:** リクエストスペック中心に API 動作を網羅的に検証
- **Jest:** フロントエンドのユーティリティ・コンポーネントをユニットテスト
- **SimpleCov:** バックエンドのコードカバレッジを計測・CI で閾値管理

---

## Architecture

### System Overview（全体構成）

```mermaid
graph TD
    Browser["🌐 Browser"]
    FE["▲ Next.js 16<br/>(Vercel)"]
    BE["🚂 Rails 7.1 API<br/>(Render)"]
    DB[("🐘 PostgreSQL")]
    AI["🤖 OpenAI API<br/>(GPT-4)"]
    Stripe["💳 Stripe"]
    Sentry["🔍 Sentry"]

    Browser -->|HTTPS| FE
    FE -->|REST API + Cookie| BE
    BE --> DB
    BE -->|Dream analysis| AI
    BE -->|Checkout Session| Stripe
    Stripe -->|Webhook POST| BE
    FE -->|Error reporting| Sentry
    BE -->|Error reporting| Sentry
```

---

### Authentication Flow（JWT認証フロー）

```mermaid
sequenceDiagram
    participant B as Browser
    participant FE as Next.js (Vercel)
    participant BE as Rails API (Render)

    B->>FE: POST /api/auth/login
    FE->>BE: POST /auth/login (forward)
    BE-->>FE: JWT token (Set-Cookie: HttpOnly)
    FE-->>B: Cookie set (HttpOnly, Secure)

    B->>FE: GET /dreams (with Cookie)
    FE->>BE: GET /dreams (Cookie forwarded)
    BE->>BE: Decode JWT, authorize user
    BE-->>FE: Dreams JSON
    FE-->>B: Render dreams
```

---

### Payment Flow（Stripe決済フロー）

```mermaid
sequenceDiagram
    participant B as Browser
    participant FE as Next.js /api/checkout
    participant BE as Rails CheckoutController
    participant S as Stripe

    B->>FE: POST /api/checkout
    FE->>BE: POST /checkout (with Cookie)
    BE->>BE: ensure_stripe_customer_id!
    BE->>S: Create Checkout Session
    S-->>BE: session.url
    BE-->>FE: {url}
    FE-->>B: Redirect to Stripe

    S-->>B: Redirect → /donation/success
    S->>BE: POST /webhooks/stripe (checkout.session.completed)
    BE->>BE: Verify signature (STRIPE_WEBHOOK_SECRET)
    BE->>BE: Deduplicate + persist Payment record
```

---

## Getting Started

### Prerequisites

- Docker Desktop 24+
- Docker Compose v2
- Make (macOS: pre-installed)

### Quick Start (Docker)

```bash
git clone https://github.com/isekaisaru/dream-journal-app.git
cd dream-journal-app
cp backend/.env.example backend/.env
# Fill in required values in backend/.env (see Environment Variables below)
make dev-up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

### Useful Make Commands

| Command | Description |
|---|---|
| `make dev-up` | Start all services (background) |
| `make dev-down` | Stop and remove containers |
| `make dev-logs` | Stream combined logs |
| `make health` | Health check for both services |
| `make db-setup` | Run migrations + seed |
| `make clean` | Prune unused Docker resources |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `RAILS_MASTER_KEY` | Rails credentials master key | ✅ |
| `SECRET_KEY_BASE` | Rails session encryption key (`rails secret`) | ✅ |
| `JWT_SECRET_KEY` | JWT signing key (`openssl rand -hex 64`) | ✅ |
| `POSTGRES_PASSWORD` | PostgreSQL password (16+ chars recommended) | ✅ |
| `FRONTEND_URL` | Stripe success/cancel redirect base URL | ✅ |
| `STRIPE_SECRET_KEY` | Stripe API secret key (`sk_test_...`) | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for dream analysis | Optional |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Public backend URL (used in Vercel production) |
| `INTERNAL_API_URL` | Internal backend URL for server-side calls |

> ⚠️ **Never commit secret values.** Use `.env.example` as a template and only set actual values in your local `.env` files.

---

## Running Tests

### Backend (RSpec + SimpleCov)

```bash
cd backend
bundle exec rspec
```

### Frontend (Jest)

```bash
cd frontend
yarn test
```

### E2E (Playwright)

```bash
# Requires the app to be running (make dev-up)
cd frontend
yarn e2e
```

### Stripe Webhook (Local)

```bash
# Terminal 1: Forward Stripe events to local server
stripe listen --forward-to localhost:3001/webhooks/stripe

# Terminal 2: Trigger test event
stripe trigger checkout.session.completed
```

Test card: `4242 4242 4242 4242` / any future date / any CVC

---

## CI/CD

GitHub Actions runs automatically on every push and pull request to `main`.

### E2E Tests (`.github/workflows/e2e-test.yml`)

1. Install Node.js 20 + Playwright browsers
2. Build the Next.js app
3. Start the production server
4. Run `e2e/smoke.spec.ts` and `e2e/donation.spec.ts` via Playwright

### Backend Tests (`.github/workflows/backend-test.yml`)

1. Spin up PostgreSQL 14 service container
2. Set up Ruby 3.3 with bundler cache
3. Run `bundle exec rspec`
4. SimpleCov generates coverage report; CI enforces minimum threshold

### Quality Gates

| Check | Tool | Status |
|---|---|---|
| E2E Browser Tests | Playwright | Auto on push/PR |
| Backend Unit/Request Tests | RSpec | Auto on push/PR |
| Frontend Unit Tests | Jest | `yarn test` |
| Code Coverage | SimpleCov | Threshold enforced in CI |
| Error Monitoring | Sentry | Always-on in production |

---

## Technical Highlights

### 1. Production-Grade Payment Flow
`ensure_stripe_customer_id!` で既存 Stripe 顧客の再利用・削除済み顧客の再作成を自動化。`client_reference_id` による user 解決 + email・`stripe_customer_id` でのフォールバックで、決済の完全性を担保。本番環境で決済完了を確認済み。

### 2. Observability by Design
`PaymentsObservability` サービスで Webhook イベントの構造化ログと KPI カウンターを統一管理。`[PaymentsKPI]` ログで障害時の素早いトリアージを実現。障害対応手順は [`docs/runbook-payments.md`](docs/runbook-payments.md) として Runbook 化。

### 3. Security in Depth
- JWT を HttpOnly Cookie に格納（XSS によるトークン漏洩を防止）
- Stripe Webhook の署名検証（`Stripe::Webhook.construct_event`）で偽リクエストを排除
- CORS を本番ドメインのみに厳格設定
- Dependabot アラートを体系的に優先度分類し、25件以上を解消

### 4. Cross-Domain Architecture
フロントエンド（Vercel）とバックエンド（Render）を別ドメインで分離運用。Cookie の `SameSite` / `Secure` 設定、CORS ヘッダー、Stripe リダイレクト URL のすべてをクロスドメイン前提で設計。

---

## Project Structure

```
.
├── frontend/               # Next.js App Router
│   ├── app/                # Pages & API route handlers
│   ├── __tests__/          # Jest unit tests
│   └── e2e/                # Playwright E2E tests
├── backend/                # Rails 7.1 API
│   ├── app/controllers/    # API controllers (auth, dreams, checkout, webhooks)
│   ├── app/services/       # PaymentsObservability, etc.
│   └── spec/               # RSpec tests (requests, models, services)
├── docs/
│   ├── runbook-payments.md # Payment incident runbook
│   └── release-checklist-payments.md
├── docker-compose.yml
├── docker-compose.dev.yml
└── Makefile
```

---

## Author

**Tyougorou** — Career changer: Logistics Manager → Full-Stack Engineer

- 1+ year of solo development with continuous daily commits
- Built and shipped a production-ready full-stack app with real payment processing
- Focused on **Reliability**, **Security**, and **Observability**

---

## License

[MIT](LICENSE)
