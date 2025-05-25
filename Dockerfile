# Node.js 16 を使用
FROM node:16

# 作業ディレクトリ
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm install

# アプリの全ファイルをコピー
COPY . .

# 必要なら公開ポート（Express を使ってるなら）
EXPOSE 3000

# アプリ起動
CMD ["node", "main.mjs"]
