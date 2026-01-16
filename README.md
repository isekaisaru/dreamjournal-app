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
- **コスト管理**: OpenAI API のハードリミット設定によるインシデント回避と予算管理
- **ログ監視**: 本番環境（Render）のログ監視体制を確立済み


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
