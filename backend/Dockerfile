# syntax=docker/dockerfile:1
ARG RUBY_VERSION=3.3.0
FROM ruby:${RUBY_VERSION}-bullseye
# 修正: ステージ名を小文字に（推奨）
FROM ruby:${RUBY_VERSION}-bullseye AS builder
# 一貫して開発モード
# 環境変数の設定
ENV RAILS_ENV=production \
    BUNDLE_WITHOUT="development test" \

# 必要最小限のパッケージ
# 作業ディレクトリの設定
WORKDIR /app

# 改善1: 必要なパッケージのインストールを1つにまとめる
# ビルドに必要なパッケージを一度にインストールし、キャッシュを削除してイメージサイズを削減
      build-essential \
      libpq-dev \
      libvips-dev \
      libpq5 \
    postgresql-client \
    git \
    gnupg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

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

# 改善2: HEALTHCHECKで使うcurlを本番ステージに追加
# 必要なランタイムパッケージをインストール
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
      libvips42 \
      curl \
      git \

# 非rootユーザー
# アプリケーションデータをコピー
COPY --from=builder /usr/local/bundle/ /usr/local/bundle/
COPY --from=builder /app /app
COPY Gemfile Gemfile.lock ./
# gem焼き込み
# 非rootユーザーを作成
RUN groupadd -r rails && useradd --no-log-init -r -g rails rails \
    && chown -R rails:rails /usr/local/bundle /app
# アプリコード
#  開店準備マニュアルをコンテナにコピー
COPY entrypoint.sh /usr/bin/
# entrypoint設定
# 修正1: 改行コードの問題を確実に解決
# Windowsの改行コード(CRLF)が混入していても、ここでLinux形式(LF)に変換
RUN sed -i 's/\r$//' /usr/bin/entrypoint.sh
# 権限調整
# 修正3: 実行権限をより確実な方法で付与します
RUN chmod +x /usr/bin/entrypoint.sh



EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 修正2: ENTRYPOINTをよりシンプルで直接的な形式に


# コンテナ起動時にRailsサーバーを実行
CMD ["bundle", "exec", "rails", "s", "-p", "3001", "-b", "0.0.0.0"]
CMD ["bundle","exec","rails","server","-p","3001","-b","0.0.0.0"]