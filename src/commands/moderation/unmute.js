const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, modEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../services/loggingService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a member')
    .addUserOption(opt => opt.setName('user').setDescription('The user to unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Error', 'Could not find that user.')], ephemeral: true });
    if (!target.isCommunicationDisabled()) return interaction.reply({ embeds: [errorEmbed('Error', 'This user is not muted.')], ephemeral: true });

    await target.timeout(null, `Unmuted by ${interaction.user.tag}`);

    sendLog(interaction.client, interaction.guild.id, 'moderation', modEmbed('Member Unmuted', `**${target.user.tag}** has been unmuted.`, interaction.user.tag));

    interaction.reply({ embeds: [successEmbed('Member Unmuted', `**${target.user.tag}** has been unmuted.`)] });
  }
};
