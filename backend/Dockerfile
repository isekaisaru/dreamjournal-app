# syntax=docker/dockerfile:1

# ========================================
# 🚀 夢ログ バックエンド最適化Dockerfile v3
# ========================================
# 
# 最適化ポイント:
# 1. レイヤーキャッシュを最大活用する順序
# 2. マルチステージビルドでイメージ軽量化
# 3. 開発/本番環境の適切な切り分け
# 4. セキュリティ強化（non-rootユーザー）

ARG RUBY_VERSION=3.3.0
ARG RAILS_ENV=production

# ========================================
# 📦 Base Stage: 共通基盤
# ========================================
FROM ruby:${RUBY_VERSION}-bullseye AS base

# 環境変数設定
ENV RAILS_ENV=${RAILS_ENV} \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_JOBS=4 \
    BUNDLE_RETRY=3

# 基本的なランタイム依存関係のインストール
# apt-get clean と rm を同じRUNレイヤーで実行し、イメージサイズを最適化
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
      libvips \
      postgresql-client \
      # ヘルスチェック用
      curl \
      # Whisperでの音声ファイル変換用
      ffmpeg \
      # タイムゾーンデータ
      tzdata \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
# Copy application code
WORKDIR /app

# ========================================
# 🔨 Builder Stage: ビルド専用
# ========================================
FROM base AS builder

# ビルド時依存関係のインストール
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
      # コンパイルツール
      build-essential \
      # PostgreSQL開発ライブラリ
      libpq-dev \
      # Git（Gemfile内のgit参照対応）
      git \
    && rm -rf /var/lib/apt/lists/*

# 🎯 最重要最適化: Gemfile関連を先にコピー
# これによりGemfileが変更されない限りbundle installはキャッシュされる
COPY Gemfile Gemfile.lock ./

# 環境に応じたGemインストール（開発用gemも含む or 本番のみ）
RUN echo "🚀 Rails環境: $RAILS_ENV でGemインストール開始" && \
    if [ "$RAILS_ENV" = "production" ]; then \
      echo "📦 本番用Gemインストール中..." && \
      bundle config set --local without 'development test' && \
      bundle install --jobs $BUNDLE_JOBS --retry $BUNDLE_RETRY; \
    else \
      echo "📦 開発用Gemインストール中（全環境）..." && \
      bundle install --jobs $BUNDLE_JOBS --retry $BUNDLE_RETRY; \
    fi && \
    echo "✅ Gemインストール完了" && \
    bundle clean --force

# アプリケーションコードをコピー（Gemインストール後）
COPY . .

# 本番環境でのアセットプリコンパイル（必要に応じて）
RUN if [ "$RAILS_ENV" = "production" ]; then \
      echo "🎨 アセットプリコンパイル実行中..." && \
      bundle exec rails assets:precompile && \
      echo "✅ アセットプリコンパイル完了"; \
    fi

# ========================================
# 🏃 Final Stage: 実行環境
# ========================================
FROM base AS final

# セキュリティ: non-rootユーザー作成
RUN groupadd -r rails && \
    useradd --no-log-init -r -g rails rails && \
    mkdir -p /app/tmp /app/log && \
    chown -R rails:rails /app

# ビルドステージから必要なファイルのみコピー
COPY --from=builder --chown=rails:rails /usr/local/bundle/ /usr/local/bundle/
COPY --from=builder --chown=rails:rails /app /app

# エントリーポイントスクリプトの準備
COPY --chown=rails:rails entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh && \
    # Windows環境での改行コード対応
    sed -i 's/\r$//' /usr/bin/entrypoint.sh

# セキュリティ: railsユーザーに切り替え
USER rails:rails

# ポート公開
EXPOSE 3001

# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 起動設定
ENTRYPOINT ["/usr/bin/entrypoint.sh"]
CMD ["bundle", "exec", "rails", "server", "-p", "3001", "-b", "0.0.0.0"]

# ========================================
# 📊 ビルド情報
# ========================================
LABEL \
  org.opencontainers.image.title="Dream Journal Backend" \
  org.opencontainers.image.description="Rails API for Dream Journal Application" \
  org.opencontainers.image.version="3.0" \
  org.opencontainers.image.source="https://github.com/your-org/dream-journal" \
  maintainer="Dream Journal Team"