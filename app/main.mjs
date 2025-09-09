import fs from "fs";
import path from "path";
import express from "express";
import { Client, Collection, Events, GatewayIntentBits, ActivityType, EmbedBuilder } from "discord.js";
import CommandsRegister from "./regist-commands.mjs";
import Notification from "./models/notification.mjs";
import YoutubeFeeds from "./models/youtubeFeeds.mjs";
import YoutubeNotifications from "./models/youtubeNotifications.mjs";
import Points from "./models/points.mjs";

import Sequelize from "sequelize";
import Parser from 'rss-parser';
const parser = new Parser();

import { Client as Youtubei, MusicClient } from "youtubei";
import googleTrends from 'google-trends-api';
import { GoogleGenerativeAI } from "@google/generative-ai";

const youtubei = new Youtubei();
const NEW_USER_ROLE_ID = '1116733355615064104'; // "新規さん" role ID
const UNAUTHENTICATED_ROLE_ID = '1357318059391717416'; // "未認証" role ID
const LV2_ROLE_ID = '1116734119909523587'; // "Lv2" role ID
const LV3_ROLE_ID = '1181793540041347173'; // "Lv3" role ID
const NOTIFICATION_CHANNEL_ID = '1284878235309572127';
const TRENDS_CHANNEL_ID = '1116735137594474577'; // Google Trendsを投稿するチャンネル
const CHECK_INTERVAL = 15 * 24 * 60 * 60 * 1000; // 15 days
const TRENDS_INTERVAL = 60 * 60 * 1000; // 1 hour

// Gemini AI初期化
let genAI;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

let postCount = 0;
const app = express();
app.listen(3000);
app.post('/', function(req, res) {
  console.log(`Received POST request..`);
  
  postCount++;
  if (postCount == 10) {
    trigger();
    postCount = 0;
  }
  
  res.send('POST response by glitch');
})
app.get('/', function(req, res) {
  res.send('<a href="https://note.com/exteoi/n/n0ea64e258797</a> に解説があります。');
})

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers, // メンバー情報を取得するために追加
    GatewayIntentBits.DirectMessages, // DMを送信するために追加
  ],
});

client.commands = new Collection();

const categoryFoldersPath = path.join(process.cwd(), "commands");
const commandFolders = fs.readdirSync(categoryFoldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(categoryFoldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".mjs"));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    import(filePath).then((module) => {
      client.commands.set(module.data.name, module);
    });
  }
}

const handlers = new Map();

const handlersPath = path.join(process.cwd(), "handlers");
const handlerFiles = fs.readdirSync(handlersPath).filter((file) => file.endsWith(".mjs"));

for (const file of handlerFiles) {
  const filePath = path.join(handlersPath, file);
  import(filePath).then((module) => {
    handlers.set(file.slice(0, -4), module);
  });
}

client.on("interactionCreate", async (interaction) => {
  await handlers.get("interactionCreate").default(interaction);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  await handlers.get("voiceStateUpdate").default(oldState, newState);
});

client.on("messageCreate", async (message) => {
  if (message.author.id == client.user.id || message.author.bot) return;
  await handlers.get("messageCreate").default(message);
});

client.on("ready", async () => {
  await client.user.setActivity(' ', { type: ActivityType.Custom, state: "Ressabaに参加中" });
  console.log(`${client.user.tag} がログインしました！`);
  
  // 認証システムの初期チェックを実行
  await checkAndUpdateRoles(client);
  
  // 定期的なチェックをセットアップ（15日ごと）
  setInterval(async () => {
    console.log('Running scheduled role check...');
    await checkAndUpdateRoles(client);
    await notifyUnauthenticatedUsers(client);
  }, CHECK_INTERVAL);

  // Google Trendsの定期投稿をセットアップ（1時間ごと）
  setInterval(async () => {
    console.log('Checking Google Trends...');
    await postTrendingTopics(client);
  }, TRENDS_INTERVAL);

  // 初回実行（起動時にも投稿）
  setTimeout(async () => {
    await postTrendingTopics(client);
  }, 10000); // 10秒後に初回実行
});

// 新規メンバーが参加したときにロールをチェック
client.on(Events.GuildMemberAdd, async (member) => {
  console.log(`新しいメンバーが参加しました: ${member.user.tag}`);
  await updateRoleForMember(member);
});

// メンバーのロールが変更されたときにチェック
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  // ロールが変更されたかチェック
  if (oldMember.roles.cache.size !== newMember.roles.cache.size ||
      !oldMember.roles.cache.every(role => newMember.roles.cache.has(role.id))) {
    console.log(`メンバーのロールが更新されました: ${newMember.user.tag}`);
    await updateRoleForMember(newMember);
  }
});

// Google Trendsから話題を取得して投稿する関数
async function postTrendingTopics(client) {
  try {
    const channel = client.channels.cache.get(TRENDS_CHANNEL_ID);
    if (!channel) {
      console.error('Trendsチャンネルが見つかりません');
      return;
    }

    console.log('Google Trendsから話題を取得中...');
    
    // 日本の今日のトレンドを取得
    const trendsData = await googleTrends.dailyTrends({
      trendDate: new Date(),
      geo: 'JP', // 日本
    });

    const trends = JSON.parse(trendsData);
    const trendingSearches = trends.default.trendingSearchesDays[0].trendingSearches;

    if (!trendingSearches || trendingSearches.length === 0) {
      console.log('トレンドデータが見つかりませんでした');
      return;
    }

    // 上位5つのトレンドを選択
    const topTrends = trendingSearches.slice(0, 5);
    
    // Gemini AIでネガティブな話題をフィルタリング
    const filteredTrends = await filterNegativeTopics(topTrends);

    if (filteredTrends.length === 0) {
      console.log('ポジティブな話題が見つかりませんでした');
      return;
    }

    // ランダムに1つの話題を選択
    const selectedTrend = filteredTrends[Math.floor(Math.random() * filteredTrends.length)];
    
    // トレンドの詳細情報を取得
    const trendTitle = selectedTrend.title.query;
    const formattedVolume = selectedTrend.formattedTraffic || '情報なし';
    
    // 関連記事があれば取得
    const relatedArticles = selectedTrend.articles || [];
    const topArticle = relatedArticles[0];

    // Embedを作成
    const embed = new EmbedBuilder()
      .setColor(0x4285f4) // Googleブルー
      .setTitle(`🔥 今話題: ${trendTitle}`)
      .setDescription(`検索数: ${formattedVolume}`)
      .setTimestamp()
      .setFooter({ text: 'Google Trends より' });

    // 関連記事があれば追加
    if (topArticle) {
      embed.addFields({
        name: '📰 関連記事',
        value: `[${topArticle.title}](${topArticle.url})`,
        inline: false
      });

      // 記事の画像があれば設定
      if (topArticle.image && topArticle.image.newsUrl) {
        embed.setThumbnail(topArticle.image.newsUrl);
      }
    }

    await channel.send({ embeds: [embed] });
    console.log(`トレンド投稿完了: ${trendTitle}`);

  } catch (error) {
    console.error('Google Trendsの投稿でエラーが発生しました:', error);
  }
}

// Gemini AIを使ってネガティブな話題をフィルタリング
async function filterNegativeTopics(trends) {
  if (!genAI) {
    console.log('Gemini APIが設定されていません。フィルタリングなしで続行します。');
    return trends;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const filteredTrends = [];
    
    for (const trend of trends) {
      const query = trend.title.query;
      
      const prompt = `
以下のトピックがネガティブな内容かどうかを判断してください。
ネガティブな内容には以下が含まれます：
- 事故、災害、死亡、病気
- 政治的な対立や論争
- 犯罪、暴力、戦争
- スキャンダル、不祥事
- その他、人を不快にさせる可能性のある内容

判断結果は「POSITIVE」または「NEGATIVE」のみで答えてください。

トピック: "${query}"
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const judgement = response.text().trim().toUpperCase();
      
      console.log(`トピック「${query}」の判定: ${judgement}`);
      
      if (judgement.includes('POSITIVE')) {
        filteredTrends.push(trend);
      }
    }
    
    return filteredTrends;
  } catch (error) {
    console.error('Gemini AIでのフィルタリング中にエラーが発生しました:', error);
    // エラーの場合は元のトレンドをそのまま返す
    return trends;
  }
}

// 全ギルドメンバーのロールをチェックして更新
async function checkAndUpdateRoles(client) {
  try {
    for (const guild of client.guilds.cache.values()) {
      console.log(`ギルドのロールをチェック中: ${guild.name}`);
      
      // 全メンバーを取得
      const members = await guild.members.fetch();
      
      // 各メンバーのロールを更新
      let updatedCount = 0;
      for (const member of members.values()) {
        if (!member.user.bot) {
          const updated = await updateRoleForMember(member);
          if (updated) updatedCount++;
        }
      }
      
      console.log(`${guild.name} で ${updatedCount} 人のメンバーのロールを更新しました`);
    }
  } catch (error) {
    console.error('ロールのチェックと更新中にエラーが発生しました:', error);
  }
}

// 特定のメンバーのロールを更新
async function updateRoleForMember(member) {
  try {
    const hasNewUserRole = member.roles.cache.has(NEW_USER_ROLE_ID);
    const hasUnauthenticatedRole = member.roles.cache.has(UNAUTHENTICATED_ROLE_ID);
    const hasLv2Role = member.roles.cache.has(LV2_ROLE_ID);
    const hasLv3Role = member.roles.cache.has(LV3_ROLE_ID);
    
    // Lv2またはLv3ロールを持っている場合
    if (hasLv2Role || hasLv3Role) {
      // 未認証ロールを持っている場合は削除
      if (hasUnauthenticatedRole) {
        await member.roles.remove(UNAUTHENTICATED_ROLE_ID);
        console.log(`${member.user.tag} は Lv2/Lv3 のため「未認証」ロールを削除しました`);
        return true;
      }
      return false; // 何も変更しない
    }
    
    // 「新規さん」ロールの確認
    if (hasNewUserRole && hasUnauthenticatedRole) {
      // メンバーが「新規さん」ロールを持っていて、「未認証」ロールも持っている場合、「未認証」を削除
      await member.roles.remove(UNAUTHENTICATED_ROLE_ID);
      console.log(`${member.user.tag} から「未認証」ロールを削除しました`);
      return true;
    } else if (!hasNewUserRole && !hasUnauthenticatedRole && !hasLv2Role && !hasLv3Role) {
      // メンバーが「新規さん」、「Lv2」、「Lv3」いずれのロールも持っておらず、「未認証」ロールも持っていない場合、「未認証」を追加
      await member.roles.add(UNAUTHENTICATED_ROLE_ID);
      console.log(`${member.user.tag} に「未認証」ロールを追加しました`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`メンバー ${member.user.tag} のロールを更新中にエラーが発生しました:`, error);
    return false;
  }
}

// 未認証ユーザーに通知を送信
async function notifyUnauthenticatedUsers(client) {
  try {
    for (const guild of client.guilds.cache.values()) {
      const channel = guild.channels.cache.get(NOTIFICATION_CHANNEL_ID);
      
      if (!channel) {
        console.error(`ギルド ${guild.name} で通知チャンネルが見つかりませんでした`);
        continue;
      }
      
      console.log(`ギルドで通知を送信中: ${guild.name}`);
      
      // 「未認証」ロールを持たないすべてのメンバーを取得（ただし、Lv2/Lv3ロールを持つメンバーは除外）
      const members = await guild.members.fetch();
      const unauthenticatedMembers = members.filter(
        member => !member.user.bot && 
                 !member.roles.cache.has(UNAUTHENTICATED_ROLE_ID) && 
                 !member.roles.cache.has(LV2_ROLE_ID) && 
                 !member.roles.cache.has(LV3_ROLE_ID)
      );
      
      if (unauthenticatedMembers.size === 0) {
        console.log('通知する未認証メンバーはいません');
        continue;
      }
      
      // 通知メッセージを作成
      const notificationEmbed = new EmbedBuilder()
        .setTitle('認証が完了していません')
        .setDescription(`## あなたは認証が完了していません。\n認証をしなくてもサーバーの利用はしていただけますが、一部機能が制限されています。\n@未認証`)
        .setColor('#FF0000')
        .setTimestamp();
      
      // 各未認証メンバーにメンション
      for (const member of unauthenticatedMembers.values()) {
        await channel.send({
          content: `${member.toString()}`,
          embeds: [notificationEmbed]
        });
        console.log(`${member.user.tag} に通知を送信しました`);
      }
    }
  } catch (error) {
    console.error('通知の送信中にエラーが発生しました:', error);
  }
}

// データベースの同期を安全に行う
async function initializeDatabase() {
  try {
    console.log("[DB] データベーステーブルの同期を開始します...");
    
    // 既存のデータを保持したまま、テーブル構造のみを更新
    await Notification.sync({ alter: true });
    console.log("[DB] Notificationテーブルの同期が完了しました");
    
    await YoutubeFeeds.sync({ alter: true });
    console.log("[DB] YoutubeFeedsテーブルの同期が完了しました");
    
    await YoutubeNotifications.sync({ alter: true });
    console.log("[DB] YoutubeNotificationsテーブルの同期が完了しました");
    
    // ポイントテーブルも安全に同期（force: falseを確実にする）
    await Points.sync({ alter: true, force: false });
    console.log("[DB] Pointsテーブルの同期が完了しました（データは保持されます）");
    
    console.log("[DB] 全データベーステーブルの同期が完了しました");
  } catch (error) {
    console.error("[DB] データベースの初期化中にエラーが発生しました:", error);
    throw error;
  }
}

(async () => {
  try {
    console.log("[INIT] 起動プロセスを開始します...");
    
    // まずデータベースを初期化
    console.log("[INIT] データベースの初期化を開始します...");
    await initializeDatabase();
    console.log("[INIT] データベースの初期化が完了しました");
    
    // 次にコマンドを登録
    console.log("[INIT] コマンド登録を開始します...");
    await CommandsRegister();
    console.log("[INIT] コマンド登録が完了しました");
    
    // 最後にBotをログイン
    console.log("[INIT] Discordへのログインを開始します...");
    await client.login(process.env.TOKEN);
    console.log("[INIT] ログインが完了しました");
  } catch (error) {
    console.error("[INIT] 起動プロセスでエラーが発生しました:", error);
    process.exit(1); // エラーが発生した場合は終了
  }
})();

async function trigger() {
  const youtubeNofications = await YoutubeNotifications.findAll({
    attributes: [
      [Sequelize.fn('DISTINCT', Sequelize.col('channelFeedUrl')) ,'channelFeedUrl'],
    ]
  });
  await Promise.all(
    youtubeNofications.map(async n => {
      checkFeed(n.channelFeedUrl);
    })
  );
}

async function checkFeed(channelFeedUrl) {
  
  const youtubeFeed = await YoutubeFeeds.findOne({
    where: {
      channelFeedUrl: channelFeedUrl,
    },
  });
  
  const checkedDate = new Date(youtubeFeed.channelLatestUpdateDate);
  let latestDate = new Date(youtubeFeed.channelLatestUpdateDate);
  
  const feed = await parser.parseURL(channelFeedUrl);
  const videos = feed.items.map(i => {
    const now = new Date(i.isoDate);
    
    if (now > checkedDate) {
      if (now > latestDate) {
        latestDate = now
      }
      return i;
    }
  });
  
  const notifications = await YoutubeNotifications.findAll({
    where: {
      channelFeedUrl: channelFeedUrl,
    },
  });
  const youtubeChannelId = channelFeedUrl.split('=').at(1);
  //const youtubeChannel = await youtubei.getChannel(youtubeChannelId);
  
  videos.forEach(async v => {
    if (!v) return;
    const youtubeVideolId = v.link.split('=').at(1);
    const youtubeVideo = await youtubei.getVideo(youtubeVideolId);
    
    const embed = new EmbedBuilder()
      .setColor(0xcd201f)
      .setAuthor({ name: v.author, url: `https://www.youtube.com/channel/${youtubeChannelId}`})
      .setTitle(v.title)
      .setURL(v.link)
      .setDescription(youtubeVideo.description)
      .setImage(youtubeVideo.thumbnails.best)
      .setTimestamp(new Date(v.isoDate));
    
    //.setThumbnail(youtubeChannel.thumbnails.best)

    notifications.forEach( n => {
      const channel = client.channels.cache.get(n.textChannelId);
      channel.send({ embeds: [embed] });
    });
  });
  
  YoutubeFeeds.update(
    { channelLatestUpdateDate: latestDate.toISOString() },
    {
      where: {
        channelFeedUrl: channelFeedUrl,
      },
    },
  );
}
