const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const Reminder = require('../../schemas/Reminder');
const { parseDuration, formatDuration } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption(opt => opt.setName('duration').setDescription('When to remind (e.g. 1h30m, 2d, 10m)').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('What to remind you about').setRequired(true)),

  async execute(interaction) {
    const durationStr = interaction.options.getString('duration');
    const message = interaction.options.getString('message');

    const duration = parseDuration(durationStr);
    if (!duration) return interaction.reply({ embeds: [errorEmbed('Error', 'Invalid duration. Use format like `10m`, `1h`, `2d`.')], ephemeral: true });
    if (duration > 30 * 86400000) return interaction.reply({ embeds: [errorEmbed('Error', 'Maximum reminder duration is 30 days.')], ephemeral: true });

    const remindAt = Date.now() + duration;
    await Reminder.create({
      userId: interaction.user.id,
      channelId: interaction.channel.id,
      guildId: interaction.guild.id,
      message,
      remindAt,
    });

    interaction.reply({
      embeds: [successEmbed('Reminder Set', `I'll remind you in **${formatDuration(duration)}** about:\n> ${message}`)]
    });
  }
};
