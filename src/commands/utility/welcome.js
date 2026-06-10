const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { successEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure welcome & goodbye messages')
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable or disable welcome system').addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(sub => sub.setName('channel').setDescription('Set the welcome/goodbye channel').addChannelOption(opt => opt.setName('channel').setDescription('The channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub => sub.setName('message').setDescription('Set the welcome message ({user}, {server}, {membercount})').addStringOption(opt => opt.setName('text').setDescription('Welcome message').setRequired(true)))
    .addSubcommand(sub => sub.setName('goodbye').setDescription('Set the goodbye message ({user}, {server}, {membercount})').addStringOption(opt => opt.setName('text').setDescription('Goodbye message').setRequired(true)))
    .addSubcommand(sub => sub.setName('autorole').setDescription('Set the auto-role for new members').addRoleOption(opt => opt.setName('role').setDescription('Role to auto-assign').setRequired(true)))
    .addSubcommand(sub => sub.setName('view').setDescription('View current welcome settings'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let settings = await GuildSettings.findOne({ guildId });
    if (!settings) settings = await GuildSettings.create({ guildId });

    if (sub === 'enable') {
      const enabled = interaction.options.getBoolean('enabled');
      await GuildSettings.updateOne({ guildId }, { 'welcome.enabled': enabled });
      interaction.reply({ embeds: [successEmbed('Welcome', `Welcome system **${enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      await GuildSettings.updateOne({ guildId }, { 'welcome.enabled': true, 'welcome.channelId': channel.id });
      interaction.reply({ embeds: [successEmbed('Welcome Config', `Welcome/goodbye channel set to <#${channel.id}>.`)] });
    }

    if (sub === 'message') {
      const text = interaction.options.getString('text');
      await GuildSettings.updateOne({ guildId }, { 'welcome.welcomeMessage': text });
      interaction.reply({ embeds: [successEmbed('Welcome Config', `Welcome message updated:\n> ${text}`)] });
    }

    if (sub === 'goodbye') {
      const text = interaction.options.getString('text');
      await GuildSettings.updateOne({ guildId }, { 'welcome.goodbyeMessage': text });
      interaction.reply({ embeds: [successEmbed('Welcome Config', `Goodbye message updated:\n> ${text}`)] });
    }

    if (sub === 'autorole') {
      const role = interaction.options.getRole('role');
      await GuildSettings.updateOne({ guildId }, { 'welcome.autoRole': role.id });
      interaction.reply({ embeds: [successEmbed('Welcome Config', `Auto-role set to <@&${role.id}>.`)] });
    }

    if (sub === 'view') {
      const w = settings.welcome;
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('Welcome Settings')
          .addFields(
            { name: 'Status', value: w.enabled ? 'Enabled' : 'Disabled', inline: true },
            { name: 'Channel', value: w.channelId ? `<#${w.channelId}>` : 'Not set', inline: true },
            { name: 'Auto-Role', value: w.autoRole ? `<@&${w.autoRole}>` : 'Not set', inline: true },
            { name: 'Welcome Message', value: w.welcomeMessage || 'Default', inline: false },
            { name: 'Goodbye Message', value: w.goodbyeMessage || 'Default', inline: false },
          )
          .setTimestamp()
        ]
      });
    }
  }
};
