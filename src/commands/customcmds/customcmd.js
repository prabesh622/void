const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const CustomCommand = require('../../schemas/CustomCommand');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customcmd')
    .setDescription('Manage custom commands')
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a custom command')
      .addStringOption(opt => opt.setName('trigger').setDescription('Command trigger word').setRequired(true))
      .addStringOption(opt => opt.setName('response').setDescription('Response text (use {user}, {server})').setRequired(true))
      .addBooleanOption(opt => opt.setName('embed').setDescription('Send as embed').setRequired(false))
      .addBooleanOption(opt => opt.setName('regex').setDescription('Use regex trigger').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a custom command')
      .addStringOption(opt => opt.setName('trigger').setDescription('Command trigger to remove').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List all custom commands'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const trigger = interaction.options.getString('trigger').toLowerCase();
      const response = interaction.options.getString('response');
      const asEmbed = interaction.options.getBoolean('embed') || false;
      const isRegex = interaction.options.getBoolean('regex') || false;

      // Validate regex if enabled
      if (isRegex) {
        try { new RegExp(trigger); } catch { return interaction.reply({ embeds: [errorEmbed('Error', 'Invalid regex pattern.')], ephemeral: true }); }
      }

      // Remove existing if any
      await CustomCommand.deleteOne({ guildId, trigger });

      await CustomCommand.create({
        guildId,
        trigger,
        response,
        asEmbed,
        isRegex,
        createdBy: interaction.user.id,
      });

      await GuildSettings.updateOne({ guildId }, { 'customCommands.enabled': true }, { upsert: true });

      interaction.reply({ embeds: [successEmbed('Custom Command', `Command \`${trigger}\` added${isRegex ? ' (regex)' : ''}.`)] });
    }

    if (sub === 'remove') {
      const trigger = interaction.options.getString('trigger').toLowerCase();
      const result = await CustomCommand.deleteOne({ guildId, trigger });
      if (result.deletedCount === 0) return interaction.reply({ embeds: [errorEmbed('Error', `No custom command with trigger \`${trigger}\` found.`)], ephemeral: true });
      interaction.reply({ embeds: [successEmbed('Custom Command', `Command \`${trigger}\` removed.`)] });
    }

    if (sub === 'list') {
      const commands = await CustomCommand.find({ guildId }).limit(25);
      if (commands.length === 0) return interaction.reply({ embeds: [infoEmbed('Custom Commands', 'No custom commands configured.')] });

      const list = commands.map(c => `\`${c.trigger}\`${c.isRegex ? ' (regex)' : ''} → ${c.response.slice(0, 50)}${c.response.length > 50 ? '...' : ''}`).join('\n');
      interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x3b82f6).setTitle('Custom Commands').setDescription(list).setFooter({ text: `${commands.length} command(s)` }).setTimestamp()]
      });
    }
  }
};
