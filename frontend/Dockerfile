# Stage 1: 依存関係のインストール
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

# Stage 2: ビルドステージ
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# Stage 3: 本番実行ステージ
FROM node:18-alpine

# 作業ディレクトリの設定
WORKDIR /app

ENV NODE_ENV=production
# 本番環境ではNEXT_PUBLIC_API_URLはdocker-compose.ymlから渡すのが一般的です
# ENV NEXT_PUBLIC_API_URL=http://backend:3001

# 必要なファイルのみをコピー
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 実行コマンドの設定
CMD ["yarn", "start"]