const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Economy = require('../../schemas/Economy');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('richest')
    .setDescription('Show the richest members'),

  async execute(interaction) {
    const entries = await Economy.find({ guildId: interaction.guild.id }).sort({ balance: -1, bank: -1 }).limit(10);

    if (entries.length === 0) {
      return interaction.reply({ embeds: [infoEmbed('Rich List', 'No one has any money yet. Use /daily and /work to earn!')] });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const list = entries.map((entry, i) => {
      const rank = i < 3 ? medals[i] : `**${i + 1}.**`;
      const netWorth = entry.balance + entry.bank;
      return `${rank} <@${entry.userId}> — **$${netWorth.toLocaleString()}** (Wallet: $${entry.balance.toLocaleString()} | Bank: $${entry.bank.toLocaleString()})`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(`${interaction.guild.name} Rich List`)
      .setDescription(list)
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
