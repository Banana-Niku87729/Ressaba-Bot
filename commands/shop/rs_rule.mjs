import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('rs_rule')
  .setDescription('RS Shopの利用規約を表示します')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator); // 管理者のみ実行可能

export async function execute(interaction) {
  try {
    // 同意ボタンを作成
    const agreeButton = new ButtonBuilder()
      .setCustomId('agree_rules')
      .setLabel('同意')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');
    
    const row = new ActionRowBuilder().addComponents(agreeButton);
    
    // ルール内容をエンベッドで作成
    const rulesEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('RS Shopの利用を開始')
      .setDescription('以下の同意ボタンをクリックすることにより\nルールを読んだものとします');
    
    // メッセージを送信
    await interaction.reply({ embeds: [rulesEmbed], components: [row] });
    
  } catch (error) {
    console.error('RS Ruleコマンド実行中にエラーが発生しました:', error);
    await interaction.reply({ 
      content: '❌ コマンドの実行に失敗しました。',
      ephemeral: true 
    });
  }
}