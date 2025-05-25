import { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('gift_get')
  .setDescription('ポイントと交換できるアイテム一覧を表示します')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator); // 管理者のみ実行可能

// 管理者チャンネルID
const ADMIN_CHANNEL_ID = '1370865924898553986'; 

export async function execute(interaction) {
  try {
    // 申請中ロールを持っているか確認
    const applicationRoleId = '申請中ロールID'; // 実際のロールIDに置き換えてください
    const member = interaction.member;
    
    if (member.roles.cache.has(applicationRoleId)) {
      return interaction.reply({
        content: '⚠️ すでに申請中のギフト交換があります。処理が完了するまでお待ちください。',
        ephemeral: true // ユーザーだけに見えるように
      });
    }
    
    // 最初のメニュー表示
    await showGiftMenu(interaction);
    
    // セレクトメニューのインタラクションを待機するコレクター
    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.customId === 'gift_select' && i.user.id === interaction.user.id
    });
    
    collector.on('collect', async i => {
      const selectedValue = i.values[0];
      let giftName = '';
      let pointsRequired = 0;
      
      // 選択された値に応じた処理
      switch (selectedValue) {
        case 'google_play_1000':
          giftName = 'Google Play 1000円分';
          pointsRequired = 100000;
          break;
        default:
          console.error('不明な選択値:', selectedValue);
          return i.update({ content: '選択されたアイテムの情報が見つかりません。', components: [] });
      }
      
      // 直接申請処理を行う（選択時に確認なし）
      try {
        // 申請中ロールを付与
        await member.roles.add(applicationRoleId);
        
        // 管理者チャンネルに承諾/キャンセル用メッセージを送信
        await sendAdminApprovalMessage(interaction.client, member.user, giftName, pointsRequired);
        
        // 一時的にメッセージを空にする
        await i.update({
          content: null,
          components: [],
          embeds: []
        });
        
        // すぐに元のメニューを再表示
        setTimeout(async () => {
          await showGiftMenu(interaction);
        }, 500); // 0.5秒後に再表示
        
      } catch (error) {
        console.error('ギフト交換処理中にエラーが発生しました:', error);
        await i.update({
          content: '❌ 処理中にエラーが発生しました。もう一度お試しください。',
          components: [],
          embeds: []
        });
      }
    });
    
  } catch (error) {
    console.error('Gift Getコマンド実行中にエラーが発生しました:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: '❌ コマンドの実行に失敗しました。',
        ephemeral: true 
      });
    } else {
      await interaction.followUp({
        content: '❌ 処理中にエラーが発生しました。',
        ephemeral: true
      });
    }
  }
}

// 管理者チャンネルに承諾/キャンセル用メッセージを送信
async function sendAdminApprovalMessage(client, user, giftName, pointsRequired) {
  try {
    // 管理者チャンネルを取得
    const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
    if (!adminChannel) {
      console.error('管理者チャンネルが見つかりません:', ADMIN_CHANNEL_ID);
      return;
    }
    
    // 承諾ボタンの作成
    const confirmButton = new ButtonBuilder()
      .setCustomId(`approve_gift_${user.id}`)
      .setLabel('承諾')
      .setStyle(ButtonStyle.Success);
    
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_gift_${user.id}`)
      .setLabel('キャンセル')
      .setStyle(ButtonStyle.Danger);
    
    const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    
    // エンベッドの作成
    const approvalEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('ギフト交換申請')
      .setDescription(`${user.tag}さんから交換申請がありました`)
      .addFields(
        { name: 'ユーザー', value: `<@${user.id}>`, inline: true },
        { name: 'アイテム', value: giftName, inline: true },
        { name: '必要ポイント', value: pointsRequired.toLocaleString(), inline: true }
      )
      .setTimestamp();
    
    // メッセージを送信
    await adminChannel.send({
      embeds: [approvalEmbed],
      components: [buttonRow]
    });
    
  } catch (error) {
    console.error('管理者メッセージ送信エラー:', error);
  }
}

// メニュー表示用関数
async function showGiftMenu(interaction) {
  // エンベッドの作成
  const giftEmbed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('ポイントと交換する')
    .setDescription('下のドロワーから選択してください');
  
  // セレクトメニュー（ドロワー）の作成
  const select = new StringSelectMenuBuilder()
    .setCustomId('gift_select')
    .setPlaceholder('ここから選択')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Google Play 1000円分')
        .setDescription('100,000ポイントと交換')
        .setValue('google_play_1000')
    );
  
  const row = new ActionRowBuilder().addComponents(select);
  
  // 初回表示か更新かで分岐
  if (!interaction.replied && !interaction.deferred) {
    return interaction.reply({ embeds: [giftEmbed], components: [row] });
  } else {
    return interaction.editReply({ 
      content: null,
      embeds: [giftEmbed], 
      components: [row] 
    });
  }
}