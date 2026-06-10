const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll a dice')
    .addIntegerOption(opt => opt.setName('sides').setDescription('Number of sides (default 6, max 100)').setMinValue(2).setMaxValue(100).setRequired(false))
    .addIntegerOption(opt => opt.setName('count').setDescription('Number of dice (default 1, max 10)').setMinValue(1).setMaxValue(10).setRequired(false)),

  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    const count = interaction.options.getInteger('count') || 1;

    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const total = rolls.reduce((a, b) => a + b, 0);
    const results = count > 1 ? `\n**Total:** ${total}` : '';

    const embed = new EmbedBuilder()
      .setColor(0xfdcb6e)
      .setTitle('🎲 Dice Roll')
      .setDescription(`Rolled **${count}d${sides}**: ${rolls.join(', ')}${results}`)
      .setFooter({ text: `Rolled by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
