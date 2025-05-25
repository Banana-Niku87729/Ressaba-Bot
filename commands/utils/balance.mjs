import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Points from '../../models/points.mjs';
export const data = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('あなたの所持ポイントを表示します');
export async function execute(interaction) {
  try {
    // ユーザーのポイント情報を取得
    const userId = interaction.user.id;
    const userPoints = await Points.findOne({ where: { userId } });
    
    console.log(`userId: ${userId}`);
    console.log(`userPoints:`, userPoints);
    
    // 現在時刻を取得
    const now = new Date();
    
    // 前回のコマンド実行時刻を取得
    const lastCheck = userPoints?.lastBalanceCheck;
    
    // タイムアウトチェック (5分 = 300000ミリ秒)
    if (lastCheck && (now - new Date(lastCheck)) < 300000) {
      const remainingTime = Math.ceil((300000 - (now - new Date(lastCheck))) / 1000);
      return interaction.reply({ 
        content: `⚠️ このコマンドは5分間に一度しか使用できません。残り時間: ${remainingTime}秒`,
        ephemeral: true 
      });
    }
    
    // ポイント情報をエンベッドで作成
    const pointsEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('💰 ポイント残高')
      .setDescription(`${interaction.user.username} さんの所持ポイント`)
      .addFields({ name: '合計ポイント', value: `${userPoints?.points || 0} ポイント` })
      .setTimestamp();
    
    // DMでポイント情報を送信を試行
    try {
      await interaction.user.send({ embeds: [pointsEmbed] });
      
      // 実行時刻を更新
      if (userPoints) {
        userPoints.lastBalanceCheck = now;
        await userPoints.save();
      } else {
        await Points.create({
          userId,
          points: 0,
          lastBalanceCheck: now
        });
      }
      
      // 公開チャンネルには成功メッセージのみ
      await interaction.reply({ 
        content: '✅ プライベートメッセージにポイント情報を送信しました！',
        ephemeral: true 
      });
    } catch (dmError) {
      console.error('DMの送信に失敗しました:', dmError);
      
      // DMの送信に失敗した場合、コマンドを実行したチャンネルにephemeralで送信
      await interaction.reply({ 
        content: '⚠️ DMの送信に失敗しました。フレンド申請を許可しているか確認してください。',
        embeds: [pointsEmbed],
        ephemeral: true 
      });
      
      // 実行時刻を更新
      if (userPoints) {
        userPoints.lastBalanceCheck = now;
        await userPoints.save();
      } else {
        await Points.create({
          userId,
          points: 0,
          lastBalanceCheck: now
        });
      }
    }
    
  } catch (error) {
    console.error('ポイント表示中にエラーが発生しました:', error);
    await interaction.reply({ 
      content: '❌ ポイント情報の取得に失敗しました。',
      ephemeral: true 
    });
  }
}