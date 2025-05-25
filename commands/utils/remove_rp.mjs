import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Points from '../../models/points.mjs';

export const data = new SlashCommandBuilder()
  .setName('remove_rp')
  .setDescription('指定したユーザーのポイントを減らします（管理者専用）')
  .addUserOption(option => 
    option.setName('ユーザー')
      .setDescription('ポイントを減らすユーザー')
      .setRequired(true)
  )
  .addIntegerOption(option => 
    option.setName('ポイント')
      .setDescription('減らすポイント数')
      .setRequired(true)
      .setMinValue(1)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  try {
    // 管理者権限チェック（念のため二重チェック）
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ このコマンドは管理者のみ実行できます。',
        ephemeral: true
      });
    }

    // パラメータ取得
    const targetUser = interaction.options.getUser('ユーザー');
    const pointsToRemove = interaction.options.getInteger('ポイント');

    // ポイントデータ取得
    const userPoints = await Points.findOne({
      where: { userId: targetUser.id }
    });

    // ユーザーが見つからない場合
    if (!userPoints) {
      return interaction.reply({
        content: `❌ ${targetUser.username} さんのポイントデータが見つかりません。`,
        ephemeral: true
      });
    }

    // 前の残高を記録
    const previousPoints = userPoints.points;
    
    // ポイント減算（0未満にならないように）
    userPoints.points = Math.max(0, userPoints.points - pointsToRemove);
    await userPoints.save();

    // 実際に減らしたポイント数を計算
    const actuallyRemoved = previousPoints - userPoints.points;

    await interaction.reply({
      content: `✅ ${targetUser.username} さんのポイントを ${actuallyRemoved} ポイント減らしました。\n`
              + `前の残高: ${previousPoints} → 現在の残高: ${userPoints.points}`,
      ephemeral: true
    });

    // ログ出力
    console.log(`[ADMIN] ${interaction.user.tag} が ${targetUser.tag} から ${actuallyRemoved} ポイント減らしました。合計: ${userPoints.points}`);

  } catch (error) {
    console.error('ポイント削減中にエラーが発生しました:', error);
    await interaction.reply({
      content: '❌ ポイントの削減に失敗しました。',
      ephemeral: true
    });
  }
}