# 夢の記録アプリケーション

## 🌐 デプロイ URL

**フロントエンド**: https://dreamjournal-8u8f7y2lu-isekaisarus-projects.vercel.app/
**バックエンド**: https://dreamjournal-app.onrender.com

### 動作確認方法

**バックエンドAPI:**
```bash
curl https://dreamjournal-app.onrender.com/health
# 期待される応答: OK
```
**フロントエンド:**

ブラウザでURLにアクセスし、ログイン画面が表示されることを確認

夢の記録アプリケーションは、神話のキャラクター「モルペウス」をガイドに、夢の記録・分析・共有を支援するフルスタック Web アプリケーションです。Rails 製 API と Next.js 製フロントエンドを Docker Compose で統合し、日々の夢を安全に保存しながら感情や傾向を可視化します。

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

日々の夢を日記のように残し、キーワードや感情の推移を分析して自分自身を深く理解することを目的としたアプリケーションです。家族や友人との夢の共有機能も備えており、コミュニケーションのきっかけ作りにも役立ちます。

## 主な機能

- **夢の記録**: 夢のタイトル・本文・感情タグ・睡眠情報などを保存できます。
- **夢の分析**: 感情スコアや頻出キーワードを抽出し、過去の夢の傾向を可視化します。
- **夢の共有**: 親子や友人と夢を共有するワークスペースを作成できます。
- **AI ガイド**: モルペウスがアプリの使い方やインサイトを紹介します。
- **トライアルモード**: 体験用アカウントで素早くアプリに触れられます。

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

## 貢献者

- 名前 1 (@GitHub アカウント 1)
- 名前 2 (@GitHub アカウント 2)

プロジェクトへのご関心とサポートに感謝します！

## Week3: ブランチ保護設定完了
