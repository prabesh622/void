const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin')
    .addStringOption(o => o.setName('choice').setDescription('Your guess').setRequired(false)
      .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })),

  async execute(interaction) {
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const choice = interaction.options.getString('choice');
    const won = choice && choice === result;

    const embed = new EmbedBuilder()
      .setColor(won ? 0x00d26a : choice ? 0xff4757 : 0xffa502)
      .setTitle('🪙 Coin Flip')
      .setDescription(`The coin landed on **${result === 'heads' ? '🟡 HEADS' : '🔵 TAILS'}**!\n\n${choice ? (won ? '✅ You guessed correctly!' : '❌ Better luck next time!') : ''}`)
      .setFooter({ text: `Flipped by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
