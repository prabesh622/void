const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Level = require('../../schemas/Level');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the XP leaderboard')
    .addIntegerOption(opt => opt.setName('count').setDescription('Number of entries to show (default 10)').setMinValue(1).setMaxValue(25).setRequired(false)),

  async execute(interaction) {
    const count = interaction.options.getInteger('count') || 10;
    const entries = await Level.find({ guildId: interaction.guild.id }).sort({ xp: -1 }).limit(count);

    if (entries.length === 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x3b82f6).setDescription('No one has any XP yet. Start chatting!')] });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const list = entries.map((entry, i) => {
      const rank = i < 3 ? medals[i] : `**${i + 1}.**`;
      return `${rank} <@${entry.userId}> — Level **${entry.level}** (${entry.xp} XP)`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(`${interaction.guild.name} Leaderboard`)
      .setDescription(list)
      .setFooter({ text: `${entries.length} members` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
