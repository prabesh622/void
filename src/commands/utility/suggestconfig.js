const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggestconfig')
    .setDescription('Configure the suggestions channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('The channel for suggestions').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    await GuildSettings.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { 'suggestions.enabled': true, 'suggestions.channelId': channel.id },
      { upsert: true }
    );
    interaction.reply({ embeds: [successEmbed('Suggestion Channel Set', `Suggestions will now be posted to <#${channel.id}>.`)] });
  }
};
