const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const Warning = require('../../schemas/Warning');
const GuildSettings = require('../../schemas/GuildSettings');
const { sendLog } = require('../../services/loggingService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Manage warnings for a member')
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a warning to a member')
      .addUserOption(opt => opt.setName('user').setDescription('The user to warn').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List warnings for a member')
      .addUserOption(opt => opt.setName('user').setDescription('The user to check').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a specific warning')
      .addStringOption(opt => opt.setName('id').setDescription('Warning ID to remove').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('clear')
      .setDescription('Clear all warnings for a member')
      .addUserOption(opt => opt.setName('user').setDescription('The user to clear').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason');

      if (!target) return interaction.reply({ embeds: [errorEmbed('Error', 'Could not find that user.')], ephemeral: true });
      if (target.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('Error', 'You cannot warn yourself.')], ephemeral: true });

      const warning = await Warning.create({
        guildId,
        userId: target.id,
        reason,
        moderatorId: interaction.user.id,
        type: 'warn',
      });

      const settings = await GuildSettings.findOne({ guildId });
      if (settings?.moderation?.dmOnAction !== false) {
        await target.send({
          embeds: [new EmbedBuilder()
            .setColor(0xffa502)
            .setTitle(`Warning in ${interaction.guild.name}`)
            .setDescription(`**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
            .setTimestamp()
          ]
        }).catch(() => {});
      }

      const warnings = await Warning.find({ guildId, userId: target.id });
      sendLog(interaction.client, guildId, 'moderation', new EmbedBuilder().setColor(0xffa502).setTitle('Warning Added').setDescription(`**User:** ${target.user.tag}\n**Reason:** ${reason}\n**Total:** ${warnings.length}`).setTimestamp());

      interaction.reply({ embeds: [successEmbed('Warning Added', `**${target.user.tag}** has been warned.\n**Reason:** ${reason}\n**Total warnings:** ${warnings.length}`)] });
    }

    if (sub === 'list') {
      const target = interaction.options.getMember('user');
      if (!target) return interaction.reply({ embeds: [errorEmbed('Error', 'Could not find that user.')], ephemeral: true });

      const warnings = await Warning.find({ guildId, userId: target.id }).sort({ timestamp: -1 });
      if (warnings.length === 0) return interaction.reply({ embeds: [infoEmbed('Warnings', `**${target.user.tag}** has no warnings.`)] });

      const list = warnings.map((w, i) => `\`${String(w.id).slice(-6)}\` **${w.reason}** — by <@${w.moderatorId}> (<t:${Math.floor(w.timestamp / 1000)}:R>)`).join('\n');
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle(`Warnings for ${target.user.tag}`)
          .setDescription(list)
          .setFooter({ text: `${warnings.length} warning(s)` })
          .setTimestamp()
        ]
      });
    }

    if (sub === 'remove') {
      const id = interaction.options.getString('id');
      const warning = await Warning.findOneAndDelete({ id: Number(id), guildId });
      if (!warning) return interaction.reply({ embeds: [errorEmbed('Error', 'Warning not found or already deleted.')], ephemeral: true });
      interaction.reply({ embeds: [successEmbed('Warning Removed', `Warning \`${id}\` has been removed.`)] });
    }

    if (sub === 'clear') {
      const target = interaction.options.getMember('user');
      if (!target) return interaction.reply({ embeds: [errorEmbed('Error', 'Could not find that user.')], ephemeral: true });

      const result = await Warning.deleteMany({ guildId, userId: target.id });
      interaction.reply({ embeds: [successEmbed('Warnings Cleared', `Cleared **${result.deletedCount}** warning(s) for **${target.user.tag}**.`)] });
    }
  }
};
