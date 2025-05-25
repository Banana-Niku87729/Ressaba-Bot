import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

// 定数をローカルに定義
const UNAUTHENTICATED_ROLE_ID = '1357318059391717416'; // "未認証" role ID
const LV2_ROLE_ID = '1116734119909523587'; // "Lv2" role ID
const LV3_ROLE_ID = '1181793540041347173'; // "Lv3" role ID
const NOTIFICATION_CHANNEL_ID = '1116901635885637702';

export const data = new SlashCommandBuilder()
  .setName('authplease')
  .setDescription('認証をお願いするメッセージを送信します')
  // 管理者権限チェックを追加
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  try {
    // Get the notification channel
    const notificationChannel = interaction.guild.channels.cache.get(NOTIFICATION_CHANNEL_ID);
    
    if (!notificationChannel) {
      return interaction.reply({ 
        content: '通知チャンネルが見つかりませんでした。管理者に連絡してください。', 
        ephemeral: true 
      });
    }
    
    // 未認証ロールを持つメンバーを取得
    const members = await interaction.guild.members.fetch();
    const unauthenticatedMembers = members.filter(
      member => !member.user.bot && 
               member.roles.cache.has(UNAUTHENTICATED_ROLE_ID)
    );
    
    if (unauthenticatedMembers.size === 0) {
      return interaction.reply({ 
        content: '通知する未認証メンバーはいません', 
        ephemeral: true 
      });
    }
    
    // Create notification embed
    const notificationEmbed = new EmbedBuilder()
      .setTitle('認証が完了していません')
      .setDescription(`## あなたは認証が完了していません。\n認証をしなくてもサーバーの利用はしていただけますが、一部機能が制限されています。`)
      .setColor('#FF0000')
      .setTimestamp();
    
    // すべてのメンバーを一つのメッセージにまとめる
    const mentions = unauthenticatedMembers.map(member => member.toString()).join(' ');
    
    // 単一のメッセージで送信
    await notificationChannel.send({
      content: `${mentions}`,
      embeds: [notificationEmbed]
    });
    
    // Reply to the interaction
    await interaction.reply({ 
      content: `${unauthenticatedMembers.size}人の未認証メンバーに通知を送信しました！`, 
      ephemeral: true 
    });
    
    console.log(`${interaction.user.tag} が authplease コマンドを実行し、${unauthenticatedMembers.size}人に通知を送信しました`);
    
  } catch (error) {
    console.error('authplease コマンド実行中にエラーが発生しました:', error);
    await interaction.reply({ 
      content: 'エラーが発生しました。もう一度お試しください。', 
      ephemeral: true 
    });
  }
}