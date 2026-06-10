const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, modEmbed } = require('../../utils/embeds');
const Warning = require('../../schemas/Warning');
const GuildSettings = require('../../schemas/GuildSettings');
const { sendLog } = require('../../services/loggingService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(opt => opt.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ embeds: [errorEmbed('Error', 'Could not find that user.')], ephemeral: true });
    if (!target.bannable) return interaction.reply({ embeds: [errorEmbed('Error', 'I cannot ban this user.')], ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('Error', 'You cannot ban yourself.')], ephemeral: true });

    const botMember = interaction.guild.members.me;
    if (botMember.roles.highest.position <= target.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'My role is not high enough to ban this user.')], ephemeral: true });
    }

    const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
    const shouldDM = settings?.moderation?.dmOnAction !== false;

    // DM the target
    if (shouldDM) {
      await target.send({
        embeds: [new EmbedBuilder()
          .setColor(0xff4757)
          .setTitle(`Banned from ${interaction.guild.name}`)
          .setDescription(`**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
          .setTimestamp()
        ]
      }).catch(() => {});
    }

    await target.ban({ reason: `${interaction.user.tag}: ${reason}` });

    // Save to DB
    await Warning.create({
      guildId: interaction.guild.id,
      userId: target.id,
      reason,
      moderatorId: interaction.user.id,
      type: 'ban',
    });

    // Log
    sendLog(interaction.client, interaction.guild.id, 'moderation', modEmbed('Member Banned', `**${target.user.tag}** has been banned.\n**Reason:** ${reason}`, interaction.user.tag));

    interaction.reply({ embeds: [successEmbed('Member Banned', `**${target.user.tag}** has been banned.\n**Reason:** ${reason}`)] });
  }
};
