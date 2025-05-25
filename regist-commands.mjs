import fs from 'fs';
import path from 'path';
import { REST, Routes } from 'discord.js';

export default async function() {
  console.log("[INIT] コマンド登録処理を開始します...");
  const commands = [];
  const foldersPath = path.join(process.cwd(), 'commands');
  
  try {
    console.log(`[INIT] 作業ディレクトリ: ${process.cwd()}`);
    console.log(`[INIT] コマンドフォルダのパス: ${foldersPath}`);
    
    const commandFolders = fs.readdirSync(foldersPath);
    console.log(`[INIT] 検出されたフォルダ: ${commandFolders.join(', ')}`);
    
    for (const folder of commandFolders) {
      const commandsPath = path.join(foldersPath, folder);
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.mjs'));
      console.log(`[INIT] フォルダ "${folder}" 内のコマンドファイル: ${commandFiles.join(', ')}`);
      
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        console.log(`[INIT] コマンドをインポート中: ${filePath}`);
        
        try {
          const module = await import(filePath);
          if (module.data) {
            commands.push(module.data.toJSON());
            console.log(`[INIT] コマンド "${module.data.name}" を追加しました`);
          } else {
            console.log(`[INIT] 警告: ${filePath} には data プロパティがありません`);
          }
        } catch (importError) {
          console.error(`[INIT] コマンドインポートエラー (${filePath}):`, importError);
        }
      }
    }
    
    // 環境変数の確認
    const token = process.env.TOKEN;
    const applicationId = process.env.CLIENT_ID || process.env.APPLICATION_ID;
    
    if (!token) {
      throw new Error("[INIT] 環境変数 TOKEN が設定されていません");
    }
    
    if (!applicationId) {
      throw new Error("[INIT] 環境変数 CLIENT_ID または APPLICATION_ID が設定されていません");
    }
    
    console.log(`[INIT] トークン検出: ${Boolean(token)} (長さ: ${token.length})`);
    console.log(`[INIT] アプリケーションID検出: ${Boolean(applicationId)} (長さ: ${applicationId.length})`);
    
    // REST インスタンスの作成
    const rest = new REST().setToken(token);
    
    console.log(`[INIT] ${commands.length}つのスラッシュコマンドを更新します。`);
    
    try {
      const data = await rest.put(
        Routes.applicationCommands(applicationId),
        { body: commands }
      );
      
      console.log(`[INIT] ${data.length}つのスラッシュコマンドを正常に更新しました。`);
      console.log(`[INIT] 登録されたコマンド: ${commands.map(cmd => cmd.name).join(', ')}`);
      
      return data;
    } catch (apiError) {
      console.error('[INIT] Discord API エラー:', apiError);
      throw apiError;
    }
  } catch (error) {
    console.error('[INIT] コマンド登録処理中にエラーが発生しました:', error);
    throw error;
  }
}