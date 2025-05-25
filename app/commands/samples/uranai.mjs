import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('uranai')
  .setDescription('うらないをします');

export async function execute(interaction){
  const arr = ["今日もなんやかんやでいい日になるでしょう。★5", "まぁ山あり谷あり？それでもがんばれ。★5", "がんばれ。★5", "タンスに小指をぶつけるかも？★1", "明日雨かもね^^★5", "エラーが発生しました？お腹がすいたのでエラーを出します★5", "時々いやのことあるかも★3"]
  const random = Math.floor( Math.random() * arr.length);
  const color = arr[random];

	await interaction.reply(`${color}`);
}
