import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Points from '../../models/points.mjs';

export const data = new SlashCommandBuilder()
  .setName('add_rp')
  .setDescription('指定したユーザーのポイントを増やします（管理者専用）')
  .addUserOption(option => 
    option.setName('ユーザー')
      .setDescription('ポイントを増やすユーザー')
      .setRequired(true)
  )
  .addIntegerOption(option => 
    option.setName('ポイント')
      .setDescription('増やすポイント数')
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
    const pointsToAdd = interaction.options.getInteger('ポイント');

    // ポイントデータ取得または作成
    const [userPoints, created] = await Points.findOrCreate({
      where: { userId: targetUser.id },
      defaults: { points: 0 }
    });

    // 前の残高を記録
    const previousPoints = userPoints.points;
    
    // ポイント加算
    userPoints.points += pointsToAdd;
    await userPoints.save();

    await interaction.reply({
      content: `✅ ${targetUser.username} さんのポイントを ${pointsToAdd} ポイント追加しました。\n`
              + `前の残高: ${previousPoints} → 現在の残高: ${userPoints.points}`,
      ephemeral: true
    });

    // ログ出力
    console.log(`[ADMIN] ${interaction.user.tag} が ${targetUser.tag} に ${pointsToAdd} ポイント追加しました。合計: ${userPoints.points}`);

  } catch (error) {
    console.error('ポイント追加中にエラーが発生しました:', error);
    await interaction.reply({
      content: '❌ ポイントの追加に失敗しました。',
      ephemeral: true
    });
  }
}