# 夢の記録アプリケーション
> **Status**: 🟢 本番運用中 (Production Ready)

## 🌐 デプロイ URL

**フロントエンド**: https://dreamjournal-8u8f7y2lu-isekaisarus-projects.vercel.app/
**バックエンド**: https://dreamjournal-app.onrender.com

### 動作確認方法

**バックエンド API:**

```bash
curl https://dreamjournal-app.onrender.com/health
# 期待される応答: OK
```

**フロントエンド:**

ブラウザで URL にアクセスし、ログイン画面が表示されることを確認

夢の記録アプリケーションは、神話のキャラクター「モルペウス」をガイドに、夢の記録・分析・共有を支援するフルスタック Web アプリケーションです。Rails 製 API と Next.js 製フロントエンドを Docker Compose で統合し、日々の夢を安全に保存しながら感情や傾向を可視化します。

> **Concept**: 忙しい日常で忘れ去られる「夢」を記録し、AI分析によって自分の隠れた感情や状態に気づくためのセルフケア・ツールです。

## 目次

- [プロジェクト概要](#プロジェクト概要)
- [主な機能](#主な機能)
- [アーキテクチャ](#アーキテクチャ)
- [ディレクトリ構成](#ディレクトリ構成)
- [セットアップ](#セットアップ)
  - [前提条件](#前提条件)
  - [クイックスタート-Docker](#クイックスタート-docker)
  - [環境変数](#環境変数)
- [よく使うコマンド](#よく使うコマンド)
- [開発ワークフローのヒント](#開発ワークフローのヒント)
- [テスト](#テスト)
- [API とヘルスチェック](#apiとヘルスチェック)
- [トラブルシューティング](#トラブルシューティング)
- [開発に参加する](#開発に参加する)
- [ライセンス](#ライセンス)
- [貢献者](#貢献者)

# DreamJournal (ユメログ) - AI Dream Analysis App

> **English Version Below** | 日本語版は下部にあります

## 🌐 Production URL
- **Frontend**: https://dreamjournal-8u8f7y2lu-isekaisarus-projects.vercel.app/
- **Backend**: https://dreamjournal-app.onrender.com

## 🛠 Tech Stack
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Ruby on Rails 7 (API Mode)
- **Database:** PostgreSQL (Supabase)
- **Infrastructure:** Vercel (FE), Render (BE)
- **Monitoring:** Sentry, Lighthouse CI
- **DevOps:** Docker, GitHub Actions

## 🔐 Security & Operations
- **Authentication:** JWT (HttpOnly Cookie) based auth
- **Database Security:** Supabase RLS (Row Level Security) enabled with "Default Deny" policy
- **Performance:** Optimized for Core Web Vitals (Lighthouse Performance: 99/100)
- **CORS:** Strictly configured for production environments
- **Uptime:** 23 days of continuous production operation with zero critical incidents

## 👨💻 Author
Developed by a former Logistics Manager transitioning to Full-Stack Development.
Focusing on **Reliability**, **Security**, and **User Experience**.

---

# 夢の記録アプリケーション（日本語版）

## プロジェクト概要

日々の夢を日記のように残し、キーワード検索や簡単な分析で振り返ることを目的としたアプリケーションです。現状は個人利用を想定した設計で、家族内で使う場合は同じアカウントを共有する運用になります。

## 主な機能

- **夢の記録**: タイトル・本文・任意の感情タグを付けて保存できます (睡眠時間などの情報は未対応)。
- **夢の検索・フィルタ**: キーワード、日付範囲、感情タグでマイページ内の夢を絞り込みできます。
- **月別アーカイブ表示**: 一覧画面から各月の夢リストに遷移し、振り返りが行えます。
- **夢の分析 (ベータ)**: OpenAI API キーを設定すると、夢の本文からテキスト要約を生成します。
- **ユーザー認証**: メールアドレス登録・ログイン・ログアウト、パスワードリセットを提供します。
- **ブラウザ体験モード**: `/trial` ページでログイン不要の簡易記録を試せます（ページをリロードすると消えます）。

## 運用・保守体制

個人開発ですが、継続的な運用と信頼性を担保するための体制を構築しています。

- **エラー監視**: Sentryによるフルスタック（Frontend + Backend）エラー監視体制を構築
- **品質**: Playwright による E2E Smoke Test を導入し、デプロイごとの品質を担保
- **パフォーマンス**: Lighthouse Performance スコア 99点を達成（2026年1月測定）
- **コスト管理**: OpenAI API のハードリミット設定によるインシデント回避と予算管理
- **ログ監視**: 本番環境（Render）のログ監視体制を確立済み
- **プライバシー対応**: 利用規約・プライバシーポリシーを整備し、13歳未満の利用者向けに保護者の同意フローを実装

## 🔐 セキュリティ対策

本番環境での安全性を確保するため、以下の対策を実施しています。

- **認証**: JWT（HttpOnly Cookie）ベースの認証
- **データベースセキュリティ**: Supabase RLS（Row Level Security）を有効化
  - Default Deny（ポリシーなし）で完全封鎖
  - Rails API以外からの直接DBアクセスを遮断
- **CORS**: 本番環境用に厳格に設定
  - フロントエンド（Vercel）とバックエンド（Render）の分離構成
  - 環境変数による適切な接続管理


## 開発中の機能

- 睡眠時間・睡眠の質などの記録項目追加
- 家族や友人と夢を共有するワークスペース機能
- ガイドキャラクター「モルペウス」による使い方チュートリアル
- 永続化されたお試しアカウント（体験後にデータを引き継げる仕組み）

## アーキテクチャ

- **フロントエンド**: Next.js (React + TypeScript)。`frontend/` 以下で UI を構築し、Playwright を用いた E2E テストにも対応。
- **バックエンド**: Ruby on Rails API。JWT 認証と OpenAI API による夢分析機能を提供 (`backend/`)。
- **データベース**: PostgreSQL。docker 上で永続化ボリュームを利用。
- **インフラ**: Docker Compose によるローカル開発。`Caddyfile` でのリバースプロキシ構成や `Makefile` での運用補助コマンドを用意。

## ディレクトリ構成

```
.
├── backend/          # Rails API サーバー
├── frontend/         # Next.js クライアントアプリ
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── Makefile          # Docker ライフサイクルのエントリーポイント
├── scripts/          # モニタリングや補助ツール
└── data/             # Postgres の永続化データ (ローカル)
```

## セットアップ

### 前提条件

- Docker Desktop (24 以降推奨)
- Docker Compose v2
- Make コマンド (macOS は標準インストール済み)
- Node.js 18+ と npm (フロントエンド単体で開発する場合)

### クイックスタート-Docker

```bash
git clone <repository-url>
cd dream-journal-app
cp backend/.env.example backend/.env
make dev-up
```

起動後のエンドポイント:

- フロントエンド: http://localhost:3000
- バックエンド API: http://localhost:3001
- Postgres: localhost:5432 (ユーザー名は `postgres`)

### 環境変数

`backend/.env` に以下の最低限の値を設定します。詳細は `backend/.env.example` を参照してください。

| 変数名              | 説明                        | メモ                                     |
| ------------------- | --------------------------- | ---------------------------------------- |
| `POSTGRES_PASSWORD` | Postgres のパスワード       | 16 文字以上推奨                          |
| `RAILS_MASTER_KEY`  | Rails credentials 用キー    | `config/master.key` と一致               |
| `SECRET_KEY_BASE`   | Rails セッション暗号化キー  | `rails secret` で生成                    |
| `JWT_SECRET_KEY`    | 認証トークン署名キー        | `openssl rand -hex 64` 推奨              |
| `OPENAI_API_KEY`    | 夢分析に利用する OpenAI API | 任意機能、未設定の場合は AI 分析を無効化 |

## よく使うコマンド

`Makefile` から主なコマンドを呼び出せます。

| コマンド        | 説明                                             |
| --------------- | ------------------------------------------------ |
| `make dev-up`   | 開発用の各サービスをバックグラウンド起動         |
| `make dev-down` | 開発用コンテナを停止・削除                       |
| `make dev-logs` | 開発モードの複合ログをストリーム表示             |
| `make status`   | 現在起動中のコンテナ一覧を確認                   |
| `make health`   | バックエンド/フロントエンドのヘルスチェック      |
| `make db-setup` | 初期 DB セットアップ (マイグレーション + シード) |
| `make clean`    | 未使用の Docker リソースをクリーンアップ         |

## 開発ワークフローのヒント

- Rails コンソール: `make dev-rails-console`
- バックエンド内シェル: `make dev-shell-backend`
- フロントエンド内シェル: `make dev-shell-frontend`
- 監視スクリプト: `make monitor` または `make monitor-watch` で状態監視を自動化
- `docker-compose.dev.yml` にはホットリロード設定が含まれています。コード変更後はブラウザの再読み込みのみで反映されます。

## テスト

- **バックエンド (RSpec)**: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend bundle exec rspec`
- **バックエンド (Rails Test)**: `make test` で `rails test` を実行できます。
- **フロントエンド (Jest)**: `cd frontend && npm install && npm test`
- **E2E (Playwright)**: `cd frontend && npm run e2e`

テスト前に `make dev-up` で依存サービスを起動しておくことを推奨します。

## API とヘルスチェック

- 軽量ヘルスチェック: `GET /health`
- 詳細ヘルスチェック: `GET /health/detailed`
- 主要リソース:
  - `dreams` (CRUD + `/dreams/:id/analyze`, `/dreams/:id/analysis`, `/dreams/my_dreams`, `/dreams/month/:year_month`)
  - `emotions` (感情マスタ取得)
  - `auth` (ログイン/ログアウト/リフレッシュ、トライアルログイン、`GET /auth/me` など)
  - `password_resets` (パスワードリセットフロー)

開発環境では `ENABLE_DEV_ENDPOINTS=true` を設定すると `/dev/password_resets/token` が利用可能です。

## 💳 Stripe 決済（ローカルでの動かし方）

> ⚠️ **テストモードでは実課金は発生しません。** 以下の手順はすべてStripeのテストモード環境で動作します。

### 手順

1. `make dev-up` でローカル起動
2. ブラウザで http://localhost:3000/home を開く
3. 「💝 500円で応援する」ボタンをクリック
4. Stripe のチェックアウト画面へリダイレクトされる
5. テストカードで決済を完了する

### テストカード情報

| 項目 | 値 |
|------|-----|
| カード番号 | `4242 4242 4242 4242` |
| 有効期限 | 未来の任意の日付（例: `12/29`） |
| CVC | 任意の3桁（例: `123`） |
| 郵便番号 | 任意の数字 |

### データフロー（3行で）

```
Browser → Next.js /api/checkout → Rails /checkout → Stripe Checkout URL
```

### よくあるエラーと対処法

| エラー | 原因 | 対処 |
|--------|------|------|
| `ERR_EMPTY_RESPONSE` | 初回起動のコンパイル/再起動で接続が切れる | 30〜60秒待ってリロード（Turbopackなら2回目から速い） |
| `Found lockfile missing swc dependencies` / `Failed to patch lockfile` | lockfile混在（yarn.lock + package-lock.json 等） | **`package-lock.json` を削除** → `yarn install`（Dockerなら frontend volume をクリーン） |
| `API request ... timed out` | 初回コンパイル待ち or コールドスタート | dev環境は30s延長済み。2回目以降で確認 |
| `BACKEND_URL_NOT_SET` | 環境変数未設定 | `.env` の `INTERNAL_API_URL` または `NEXT_PUBLIC_API_URL` を確認 |

> **注意**: このプロジェクトは **yarn** を使用しています。`npm ci` や `npm install` を実行すると `package-lock.json` が再生成され、SWCエラーの再発原因になります。

### 関連する環境変数（値はコードに書かない）

```bash
# backend/.env に設定
STRIPE_SECRET_KEY=        # Stripe ダッシュボード → APIキー（テスト用は sk_test_...）
STRIPE_PUBLISHABLE_KEY=   # 同上（公開可、テスト用は pk_test_...）

# frontend/.env.local に設定
NEXT_PUBLIC_API_URL=      # バックエンドの公開URL（Render等）
INTERNAL_API_URL=         # Docker内部通信用URL（Next.js → Rails 直通、任意）
```

### Webhook署名検証（セキュリティ設計）

> ✅ 決済の「成功画面」はUX、Webhookは支払い成立の**確定情報（サーバー側の真実）**として扱います。

決済完了後にStripeから `POST /webhooks/stripe` が届きます。  
**「誰でもPOSTできる」状態を防ぐため、署名検証を実装しています。**

#### 仕組み

```
Stripe → POST /webhooks/stripe
          │
          ├─ Stripe-Signature ヘッダーを取得
          ├─ request.raw_post でボディを取得（body.readは不可）
          │
          └─ Stripe::Webhook.construct_event で検証
               ├─ JSON::ParserError    → 400（不正なJSON）
               ├─ SignatureVerificationError → 400（偽リクエスト）
               └─ 検証成功 → イベント種別ごとに処理
```

#### 設計判断メモ

| 判断 | 理由 |
|---|---|
| `request.raw_post` を使用 | `body.read` はストリームを消費し、署名検証に必要な生payloadが変化・欠落する。署名検証は1バイトでも変わると失敗するため生データをそのまま渡す必要がある |
| `verify_authenticity_token` のスキップを削除 | Rails APIモード（`ActionController::API`）ではCSRF保護が元から存在しないためスキップ自体が `ArgumentError` になる |
| `authorize_request` のみスキップ | WebhookはStripeサーバーが叩くためCookieによるJWT認証が通らない |

#### ローカルでのWebhookテスト手順

```bash
# ターミナル①：Stripe CLIでローカルに転送
stripe listen --forward-to localhost:3001/webhooks/stripe

# ターミナル②：テストイベントを発火
stripe trigger checkout.session.completed

# Railsログで確認：
# [Webhook] 支払い完了 session_id=cs_test_xxx amount=3000
```

#### 環境変数（Webhook用）

```bash
# backend/.env に追加
STRIPE_WEBHOOK_SECRET=   # stripe listen --print-secret で取得（ローカル検証用）
                         # 本番用はStripeダッシュボード → Webhooks で別途登録・発行
```

## トラブルシューティング

- コンテナの再ビルドが必要な場合は `make dev-down` → `docker-compose build --no-cache`。
- DB 関連の問題は `make db-reset` で初期化できます。
- `make logs-errors` で直近 1 時間のエラーログを抽出できます。
- OpenAI 連携を無効化したい場合は `OPENAI_API_KEY` を未設定にするか、アプリ側で機能フラグを切り替えてください。

## 開発に参加する

1. GitHub でリポジトリをフォークしてクローンします。
2. ブランチを作成します (例: `feature/add-dream-tags`)。
3. lint・テストを通し、必要に応じて `frontend/README.md` や API ドキュメントも更新します。
4. 変更内容とテスト結果を記載した Pull Request を送信してください。

Issue やアイデアの提案も歓迎です。議論したいテーマがある場合は Draft PR から相談してください。

## ライセンス

このプロジェクトは [MIT ライセンス](LICENSE) の下で公開されています。

## Author

- **Tyogoro** (Owner / Developer)

プロジェクトへのご関心とサポートに感謝します！
