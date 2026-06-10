const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),

  async execute(interaction) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '🪙' : '🪙';

    const embed = new EmbedBuilder()
      .setColor(0xfdcb6e)
      .setTitle(`${emoji} Coin Flip`)
      .setDescription(`The coin landed on **${result}**!`)
      .setFooter({ text: `Flipped by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
