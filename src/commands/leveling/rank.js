const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Level = require('../../schemas/Level');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your rank or another member\'s rank')
    .addUserOption(opt => opt.setName('user').setDescription('The user to check').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getMember('user') || interaction.member;
    if (target.user.bot) return interaction.reply({ content: 'Bots don\'t have levels.', ephemeral: true });

    const data = await Level.findOne({ guildId: interaction.guild.id, userId: target.id });
    const xp = data?.xp || 0;
    const level = data?.level || 0;
    const voiceXp = data?.voiceXp || 0;
    const prestige = data?.prestige || 0;

    const xpForCurrentLevel = Math.pow(level * 10, 2);
    const xpForNextLevel = Math.pow((level + 1) * 10, 2);
    const xpProgress = xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const percentage = Math.floor((xpProgress / xpNeeded) * 100);

    const filled = Math.floor(percentage / 5);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(`${target.user.tag}'s Rank`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'Level', value: `${level}`, inline: true },
        { name: 'Total XP', value: `${xp}`, inline: true },
        { name: 'Voice XP', value: `${voiceXp}`, inline: true },
        ...(prestige > 0 ? [{ name: 'Prestige', value: `⭐ ${prestige}`, inline: true }] : []),
        { name: 'Progress', value: `\`${bar}\` ${percentage}%\n${xpProgress}/${xpNeeded} XP to next level`, inline: false },
      )
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
