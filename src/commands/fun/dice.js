const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll dice')
    .addIntegerOption(o => o.setName('sides').setDescription('Number of sides (default 6)').setMinValue(2).setMaxValue(100).setRequired(false))
    .addIntegerOption(o => o.setName('count').setDescription('Number of dice (default 1)').setMinValue(1).setMaxValue(10).setRequired(false)),

  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    const count = interaction.options.getInteger('count') || 1;

    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const total = rolls.reduce((a, b) => a + b, 0);
    const diceEmoji = rolls.map(r => `🎲 **${r}**`).join('  ');

    const embed = new EmbedBuilder()
      .setColor(0x6c5ce7)
      .setTitle('🎲 Dice Roll')
      .setDescription(`${diceEmoji}\n\n**Total:** ${total}\n*${count}d${sides}*`)
      .setFooter({ text: `Rolled by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
