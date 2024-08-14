# ベースイメージとしてNode.jsのバージョン18を使用
FROM node:18

# コンテナ内の作業ディレクトリを指定
WORKDIR /app

# package.jsonとyarn.lockをコピー
COPY package.json yarn.lock ./

# 依存関係のインストール
RUN yarn install

# 現在のディレクトリのすべてのファイルをコピー
COPY . .

# 開発サーバーを起動
CMD ["yarn", "dev"]