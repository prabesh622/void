const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aichannel')
    .setDescription('Manage AI chat channels')
    .addSubcommand(sub => sub.setName('add').setDescription('Add a channel for AI chat').addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove an AI chat channel').addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List all AI chat channels'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let settings = await GuildSettings.findOne({ guildId });
    if (!settings) settings = await GuildSettings.create({ guildId });

    if (sub === 'add') {
      const channel = interaction.options.getChannel('channel');
      const channels = settings.ai.channels || [];
      if (channels.includes(channel.id)) return interaction.reply({ embeds: [errorEmbed('Error', `<#${channel.id}> is already an AI channel.`)], ephemeral: true });

      await GuildSettings.updateOne({ guildId }, { $push: { 'ai.channels': channel.id } });
      interaction.reply({ embeds: [successEmbed('AI Channel', `Added <#${channel.id}> as an AI chat channel.`)] });
    }

    if (sub === 'remove') {
      const channel = interaction.options.getChannel('channel');
      const result = await GuildSettings.updateOne({ guildId }, { $pull: { 'ai.channels': channel.id } });
      if (result.modifiedCount === 0) return interaction.reply({ embeds: [errorEmbed('Error', `<#${channel.id}> is not an AI channel.`)], ephemeral: true });
      interaction.reply({ embeds: [successEmbed('AI Channel', `Removed <#${channel.id}> from AI chat channels.`)] });
    }

    if (sub === 'list') {
      const channels = settings.ai.channels || [];
      if (channels.length === 0) return interaction.reply({ embeds: [infoEmbed('AI Channels', 'No AI channels configured.')] });

      const list = channels.map(c => `<#${c}>`).join('\n');
      interaction.reply({ embeds: [new EmbedBuilder().setColor(0x3b82f6).setTitle('AI Chat Channels').setDescription(list).setTimestamp()] });
    }
  }
};
