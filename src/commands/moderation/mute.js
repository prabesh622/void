const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, modEmbed } = require('../../utils/embeds');
const Warning = require('../../schemas/Warning');
const GuildSettings = require('../../schemas/GuildSettings');
const { sendLog } = require('../../services/loggingService');
const { parseDuration, formatDuration } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member')
    .addUserOption(opt => opt.setName('user').setDescription('The user to mute').setRequired(true))
    .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 10m, 1h, 1d)').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the mute').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Error', 'Could not find that user.')], ephemeral: true });
    if (!target.moderatable) return interaction.reply({ embeds: [errorEmbed('Error', 'I cannot mute this user.')], ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('Error', 'You cannot mute yourself.')], ephemeral: true });

    const duration = parseDuration(durationStr);
    if (!duration) return interaction.reply({ embeds: [errorEmbed('Error', 'Invalid duration. Use format like `10m`, `1h`, `1d`.')], ephemeral: true });
    if (duration > 28 * 86400000) return interaction.reply({ embeds: [errorEmbed('Error', 'Maximum timeout duration is 28 days.')], ephemeral: true });

    await target.timeout(duration, `${interaction.user.tag}: ${reason}`);

    const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
    const shouldDM = settings?.moderation?.dmOnAction !== false;

    if (shouldDM) {
      await target.send({
        embeds: [new EmbedBuilder()
          .setColor(0xffa502)
          .setTitle(`Muted in ${interaction.guild.name}`)
          .setDescription(`**Duration:** ${formatDuration(duration)}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
          .setTimestamp()
        ]
      }).catch(() => {});
    }

    await Warning.create({
      guildId: interaction.guild.id,
      userId: target.id,
      reason: `[MUTE ${formatDuration(duration)}] ${reason}`,
      moderatorId: interaction.user.id,
      type: 'mute',
    });

    sendLog(interaction.client, interaction.guild.id, 'moderation', modEmbed('Member Muted', `**${target.user.tag}** muted for **${formatDuration(duration)}**.\n**Reason:** ${reason}`, interaction.user.tag));

    interaction.reply({ embeds: [successEmbed('Member Muted', `**${target.user.tag}** has been muted for **${formatDuration(duration)}**.\n**Reason:** ${reason}`)] });
  }
};
