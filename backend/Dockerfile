# syntax=docker/dockerfile:1

# Rubyのバージョンを定義
ARG RUBY_VERSION=3.3.0
FROM ruby:${RUBY_VERSION}-bullseye AS Builder

# 環境変数の設定
ENV RAILS_ENV=production \
    BUNDLE_WITHOUT="development test" \
    BUNDLE_FROZEN=true \
    DEBIAN_FRONTEND=noninteractive

# 作業ディレクトリの設定
WORKDIR /app

# 必要なパッケージとDebianアーカイブキーのインストール
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    gnupg \
    curl \
    ca-certificates \
    debian-archive-keyring \
    && rm -rf /var/lib/apt/lists/*

# Debianリポジトリの設定
RUN echo "deb http://deb.debian.org/debian bullseye main" > /etc/apt/sources.list && \
    echo "deb http://deb.debian.org/debian bullseye-updates main" >> /etc/apt/sources.list && \
    echo "deb http://security.debian.org/debian-security bullseye-security main" >> /etc/apt/sources.list

# 必要なビルドパッケージのインストール
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libvips-dev \
    postgresql-client \
    git \
    && rm -rf /var/lib/apt/lists/*

# Gemfileをコピーして依存関係をインストール
COPY Gemfile Gemfile.lock ./
RUN bundle config set without 'development test' && \
    bundle install --jobs 4 --retry 3

# アプリケーションコードをコピー
COPY . ./

# アセットのプリコンパイル
ARG SECRET_KEY_BASE
ARG RAILS_MASTER_KEY
ENV SECRET_KEY_BASE=${SECRET_KEY_BASE} \
    RAILS_MASTER_KEY=${RAILS_MASTER_KEY}
RUN if [ -n "$SECRET_KEY_BASE" ] && [ -n "$RAILS_MASTER_KEY" ]; then \
    bundle exec rails assets:precompile; \
fi

# 不要なファイルを削除してイメージを軽量化
RUN rm -rf node_modules tmp/cache app/assets vendor/assets spec

# 本番環境用の軽量イメージを構築
FROM ruby:${RUBY_VERSION}-bullseye

# 必要なランタイムパッケージをインストール
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    libpq5 \
    libvips42 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# アプリケーションデータをコピー
COPY --from=Builder /usr/local/bundle/ /usr/local/bundle/
COPY --from=Builder /app /app
WORKDIR /app

# 非rootユーザーを作成
RUN groupadd -r rails && useradd --no-log-init -r -g rails rails \
    && chown -R rails:rails /usr/local/bundle /app
USER rails

# Railsサーバーのポートを公開
EXPOSE 3000

# コンテナ起動時にRailsサーバーを実行
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]