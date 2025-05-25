import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Botが作動しているかの確認');

export async function execute(interaction){
	await interaction.reply('✅作動しています');
}
