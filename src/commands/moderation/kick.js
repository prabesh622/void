const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, modEmbed } = require('../../utils/embeds');
const Warning = require('../../schemas/Warning');
const GuildSettings = require('../../schemas/GuildSettings');
const { sendLog } = require('../../services/loggingService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(opt => opt.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Error', 'Could not find that user.')], ephemeral: true });
    if (!target.kickable) return interaction.reply({ embeds: [errorEmbed('Error', 'I cannot kick this user.')], ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('Error', 'You cannot kick yourself.')], ephemeral: true });

    const botMember = interaction.guild.members.me;
    if (botMember.roles.highest.position <= target.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'My role is not high enough to kick this user.')], ephemeral: true });
    }

    const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
    const shouldDM = settings?.moderation?.dmOnAction !== false;

    if (shouldDM) {
      await target.send({
        embeds: [new EmbedBuilder()
          .setColor(0xff4757)
          .setTitle(`Kicked from ${interaction.guild.name}`)
          .setDescription(`**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
          .setTimestamp()
        ]
      }).catch(() => {});
    }

    await target.kick(`${interaction.user.tag}: ${reason}`);

    await Warning.create({
      guildId: interaction.guild.id,
      userId: target.id,
      reason,
      moderatorId: interaction.user.id,
      type: 'kick',
    });

    sendLog(interaction.client, interaction.guild.id, 'moderation', modEmbed('Member Kicked', `**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`, interaction.user.tag));

    interaction.reply({ embeds: [successEmbed('Member Kicked', `**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`)] });
  }
};
