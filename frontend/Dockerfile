# ベースイメージとしてNode.jsのバージョン18を使用
FROM node:18 AS builder

# 作業ディレクトリの設定
WORKDIR /app

# 既存のYarnを削除してからグローバルにYarn 1.xをインストール
RUN rm -rf /usr/local/bin/yarn /usr/local/bin/yarnpkg && npm install -g yarn@1


# 依存関係のインストール
COPY package.json yarn.lock ./
RUN yarn install --production=false

# アプリケーションのコピーとビルド
COPY . .
RUN yarn build

# 実行ステージ
FROM node:18-alpine

# 作業ディレクトリの設定
WORKDIR /app

# 環境変数を設定
ENV NEXT_PUBLIC_API_URL=http://backend:3001

# 必要なファイルのみをコピー
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 実行コマンドの設定
CMD ["yarn", "start"]