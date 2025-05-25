import { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import Points from '../models/points.mjs';

// 利用規約の同意処理
async function handleAgreeRules(interaction) {
  try {
    // 禁止されているロールを持っているかチェック
    if (interaction.member.roles.cache.has('1370866771137007677')) {
      return interaction.reply({
        content: '⚠️ あなたはこの機能を利用できません。',
        ephemeral: true
      });
    }
    
    // すでにロールが付与されているか確認
    if (interaction.member.roles.cache.has('1369563957789986896')) {
      return interaction.reply({
        content: 'あなたはすでに同意しています',
        ephemeral: true
      });
    }
    
    // ロールを付与
    await interaction.member.roles.add('1369563957789986896');
    
    await interaction.reply({
      content: '✅ 同意が完了しました。RS Shopをご利用いただけます。',
      ephemeral: true
    });
    
  } catch (error) {
    console.error('同意処理中にエラーが発生しました:', error);
    await interaction.reply({
      content: '❌ 処理中にエラーが発生しました。',
      ephemeral: true
    });
  }
}

// ギフト選択処理
async function handleGiftSelect(interaction) {
  try {
    // 禁止されているロールを持っているかチェック
    if (interaction.member.roles.cache.has('1370866771137007677')) {
      return interaction.reply({
        content: '⚠️ あなたはこの機能を利用できません。',
        ephemeral: true
      });
    }
    
    const selectedValue = interaction.values[0];
    
    // Google Play 1000円分が選択された場合
    if (selectedValue === 'google_play_1000') {
      const requiredPoints = 100000;
      const itemName = 'Google Play 1000円分';
      
      // ユーザーのポイントを取得
      const userPoints = await Points.findOne({
        where: { userId: interaction.user.id }
      });
      
      const currentPoints = userPoints?.points || 0;
      
      // ポイントが足りない場合
      if (currentPoints < requiredPoints) {
        const pointsNeeded = requiredPoints - currentPoints;
        return interaction.user.send(
          `✖交換に失敗しました。${pointsNeeded}ポイント不足しています。現在${currentPoints}`
        ).then(() => {
          interaction.reply({
            content: '✖ ポイント不足のため交換できません。詳細はDMをご確認ください。',
            ephemeral: true
          });
        });
      }
      
      // 申請中ロールを付与
      await interaction.member.roles.add('1370862208678101042');
      
      // 承認ボタンを作成
      const approveButton = new ButtonBuilder()
        .setCustomId(`approve_gift:${interaction.user.id}:${selectedValue}:${requiredPoints}`)
        .setLabel('承諾(ポイント削除)')
        .setStyle(ButtonStyle.Success);
      
      const cancelButton = new ButtonBuilder()
        .setCustomId(`cancel_gift:${interaction.user.id}:${selectedValue}`)
        .setLabel('キャンセル')
        .setStyle(ButtonStyle.Danger);
      
      const row = new ActionRowBuilder().addComponents(approveButton, cancelButton);
      
      // 通知チャンネルにメッセージを送信
      const notificationChannel = interaction.client.channels.cache.get('1370865924898553986');
      
      if (!notificationChannel) {
        return interaction.reply({
          content: '❌ 通知チャンネルが見つかりませんでした。',
          ephemeral: true
        });
      }
      
      await notificationChannel.send({
        content: `@${interaction.user.username}さんが${itemName}の交換を要求しています`,
        components: [row]
      });
      
      await interaction.reply({
        content: `✅ ${itemName}の交換申請を送信しました。承認されるまでお待ちください。`,
        ephemeral: true
      });
    }
    
  } catch (error) {
    console.error('ギフト選択処理中にエラーが発生しました:', error);
    await interaction.reply({
      content: '❌ 処理中にエラーが発生しました。',
      ephemeral: true
    });
  }
}

// ギフト承認処理
// ギフト承認処理
async function handleApproveGift(interaction) {
  try {
    const [_, userId, selectedValue, requiredPoints] = interaction.customId.split(':');
    
    // ユーザーを取得
    const user = await interaction.client.users.fetch(userId);
    
    if (!user) {
      return interaction.reply('❌ ユーザーが見つかりませんでした。');
    }
    
    // ポイントを減少
    const userPoints = await Points.findOne({
      where: { userId }
    });
    
    if (userPoints) {
      userPoints.points -= parseInt(requiredPoints);
      await userPoints.save();
    }
    
    // ユーザーにDMを送信試行
    try {
      await user.send('交換が承諾されました、もうしばらくお待ちください。');
      
      // 元のメッセージを更新
      await interaction.update({
        content: `✅ ${user.username}さんの交換申請が承認されました。`,
        components: []
      });
    } catch (dmError) {
      console.error('DMの送信に失敗しました:', dmError);
      
      // DMの送信に失敗した場合、指定チャンネルに通知
      const notifyChannel = interaction.client.channels.cache.get('1371388010838622319');
      if (notifyChannel) {
        await notifyChannel.send(`✖ @${user.username}さんの申請が承諾されました。(DMを許可してください)`);
      }
      
      // 元のメッセージを更新
      await interaction.update({
        content: `✅ ${user.username}さんの交換申請が承認されました。(DMの送信に失敗しました)`,
        components: []
      });
    }
    
  } catch (error) {
    console.error('ギフト承認処理中にエラーが発生しました:', error);
    await interaction.reply('❌ 処理中にエラーが発生しました。');
  }
}

// ギフトキャンセル処理
async function handleCancelGift(interaction) {
  try {
    const [_, userId, selectedValue] = interaction.customId.split(':');
    
    // ユーザーを取得
    const user = await interaction.client.users.fetch(userId);
    
    if (!user) {
      return interaction.reply('❌ ユーザーが見つかりませんでした。');
    }
    
    // ユーザーにDMを送信試行
    try {
      await user.send('交換がキャンセルされました、お知らせを確認すると原因がわかるかもしれません');
      
      // 元のメッセージを更新
      await interaction.update({
        content: `❌ ${user.username}さんの交換申請がキャンセルされました。`,
        components: []
      });
    } catch (dmError) {
      console.error('DMの送信に失敗しました:', dmError);
      
      // DMの送信に失敗した場合、指定チャンネルに通知
      const notifyChannel = interaction.client.channels.cache.get('1371388010838622319');
      if (notifyChannel) {
        await notifyChannel.send(`✅ @${user.username}さんの申請がキャンセルされました。(DMを許可してください)`);
      }
      
      // 元のメッセージを更新
      await interaction.update({
        content: `❌ ${user.username}さんの交換申請がキャンセルされました。(DMの送信に失敗しました)`,
        components: []
      });
    }
    
    // ギルドメンバーを取得してロールを削除
    const guild = interaction.guild;
    const member = await guild.members.fetch(userId);
    
    if (member) {
      // 申請中ロールを削除
      await member.roles.remove('1370862208678101042');
    }
    
  } catch (error) {
    console.error('ギフトキャンセル処理中にエラーが発生しました:', error);
    await interaction.reply('❌ 処理中にエラーが発生しました。');
  }
}

export default async function(interaction) {
  try {
    // スラッシュコマンドの処理
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`コマンド ${interaction.commandName} が見つかりません。`);
        return;
      }
      
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: 'コマンドの実行中にエラーが発生しました。',
          ephemeral: true,
        });
      }
      return;
    }
    
    // ボタンの処理
    if (interaction.isButton()) {
      // 同意ボタンの処理
      if (interaction.customId === 'agree_rules') {
        await handleAgreeRules(interaction);
        return;
      }
      
      // ギフト承認ボタンの処理
      if (interaction.customId.startsWith('approve_gift:')) {
        await handleApproveGift(interaction);
        return;
      }
      
      // ギフトキャンセルボタンの処理
      if (interaction.customId.startsWith('cancel_gift:')) {
        await handleCancelGift(interaction);
        return;
      }
    }
    
    // セレクトメニューの処理
    if (interaction.isStringSelectMenu()) {
      // ギフト選択メニューの処理
      if (interaction.customId === 'gift_select') {
        await handleGiftSelect(interaction);
        return;
      }
    }
    
  } catch (error) {
    console.error('インタラクション処理中にエラーが発生しました:', error);
  }
}