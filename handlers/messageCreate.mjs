import Points from '../models/points.mjs';

// 指定したチャンネルIDのリスト
const TARGET_CHANNELS = [
  '1116735137594474577', // チャンネルIDを実際のものに置き換えてください
  '1116735236286451732',
  "1364164971017273427",
  "1368434828873175180"// 必要に応じて複数のチャンネルを追加できます
];

// ポイント付与対象の確認関数
function isEligibleForPoints(member) {
  // 未認証ロールを持っている場合は対象外
  if (member.roles.cache.has('1357318059391717416')) {
    return false;
  }
  
  // 以下のいずれかのロールを持っていれば対象
  const requiredRoles = [
    '1116733355615064104', // 新規さん
    '1116734119909523587', // Lv2
    '1181793540041347173'  // Lv3
  ];
  
  return requiredRoles.some(roleId => member.roles.cache.has(roleId));
}

// ポイントをランダムに決定する関数
function getRandomPoints() {
  return Math.floor(Math.random() * 2) + 2; // 2-3ポイント
}

export default async function(message) {
  // Botからのメッセージは無視
  if (message.author.bot) return;
  
  // 指定されたチャンネル以外では処理しない
  if (!TARGET_CHANNELS.includes(message.channel.id)) return;
  
  try {
    // メンバー情報を取得
    const member = message.member;
    if (!member) return;
    
    // ポイント付与対象かチェック
    if (!isEligibleForPoints(member)) return;
    
    // ランダムなポイントを生成
    const pointsToAdd = getRandomPoints();
    
    // ユーザーのポイントを取得または作成
    const [userPoints, created] = await Points.findOrCreate({
      where: { userId: message.author.id },
      defaults: { points: 0 }
    });
    
    // ポイントを加算して保存
    userPoints.points += pointsToAdd;
    await userPoints.save();
    
    console.log(`${message.author.tag} に ${pointsToAdd} ポイント付与しました。合計: ${userPoints.points}`);
    
  } catch (error) {
    console.error('ポイント付与中にエラーが発生しました:', error);
  }
}