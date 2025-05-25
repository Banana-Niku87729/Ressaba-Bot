FROM node:18

# 作業ディレクトリを /app に
WORKDIR /app

# app フォルダ内の内容をコンテナの /app にコピー
COPY app/ .

# 依存関係のインストール
RUN npm install

# ポートを開ける（Koyeb用）
EXPOSE 3000

# アプリの起動
CMD ["node", "main.mjs"]
