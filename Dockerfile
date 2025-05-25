# Node.js 16 をベースに
FROM node:16

# 作業ディレクトリを作成
WORKDIR /app

# 依存ファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリのコードをコピー
COPY . .

# ポート（必要に応じて。例えば Express が使うなら 3000）
EXPOSE 3000

# アプリを起動
CMD ["npm", "start"]
