const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configure the logging system')
    .addSubcommand(sub => sub.setName('setup').setDescription('Set the log channel').addChannelOption(opt => opt.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable logging or a specific log type').addStringOption(opt => opt.setName('type').setDescription('Log type').setRequired(true)
      .addChoices(
        { name: 'All', value: 'all' }, { name: 'Message Edit', value: 'messageEdit' }, { name: 'Message Delete', value: 'messageDelete' },
        { name: 'Member Join', value: 'memberJoin' }, { name: 'Member Leave', value: 'memberLeave' },
        { name: 'Voice', value: 'voice' }, { name: 'Channel Create', value: 'channelCreate' }, { name: 'Channel Delete', value: 'channelDelete' },
        { name: 'Role Create', value: 'roleCreate' }, { name: 'Role Delete', value: 'roleDelete' }, { name: 'Role Update', value: 'roleUpdate' },
        { name: 'Moderation', value: 'moderation' }, { name: 'Server Update', value: 'serverUpdate' },
      )
    ))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable logging or a specific log type').addStringOption(opt => opt.setName('type').setDescription('Log type').setRequired(true)
      .addChoices(
        { name: 'All', value: 'all' }, { name: 'Message Edit', value: 'messageEdit' }, { name: 'Message Delete', value: 'messageDelete' },
        { name: 'Member Join', value: 'memberJoin' }, { name: 'Member Leave', value: 'memberLeave' },
        { name: 'Voice', value: 'voice' }, { name: 'Channel Create', value: 'channelCreate' }, { name: 'Channel Delete', value: 'channelDelete' },
        { name: 'Role Create', value: 'roleCreate' }, { name: 'Role Delete', value: 'roleDelete' }, { name: 'Role Update', value: 'roleUpdate' },
        { name: 'Moderation', value: 'moderation' }, { name: 'Server Update', value: 'serverUpdate' },
      )
    ))
    .addSubcommand(sub => sub.setName('status').setDescription('View logging status'))
    .addSubcommand(sub => sub.setName('ignore').setDescription('Ignore a channel from logging').addChannelOption(opt => opt.setName('channel').setDescription('Channel to ignore').setRequired(true)))
    .addSubcommand(sub => sub.setName('unignore').setDescription('Stop ignoring a channel').addChannelOption(opt => opt.setName('channel').setDescription('Channel to unignore').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let settings = await GuildSettings.findOne({ guildId });
    if (!settings) settings = await GuildSettings.create({ guildId });

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      await GuildSettings.updateOne({ guildId }, { 'logging.enabled': true, 'logging.channelId': channel.id });
      interaction.reply({ embeds: [successEmbed('Logging', `Log channel set to <#${channel.id}>. Logging enabled.`)] });
    }

    if (sub === 'enable') {
      const type = interaction.options.getString('type');
      if (type === 'all') {
        const update = { 'logging.enabled': true };
        ['messageEdit', 'messageDelete', 'memberJoin', 'memberLeave', 'voice', 'channelCreate', 'channelDelete', 'roleCreate', 'roleDelete', 'roleUpdate', 'moderation', 'serverUpdate'].forEach(t => update[`logging.${t}`] = true);
        await GuildSettings.updateOne({ guildId }, update);
        interaction.reply({ embeds: [successEmbed('Logging', 'All log types **enabled**.')] });
      } else {
        await GuildSettings.updateOne({ guildId }, { [`logging.${type}`]: true });
        interaction.reply({ embeds: [successEmbed('Logging', `**${type}** logging enabled.`)] });
      }
    }

    if (sub === 'disable') {
      const type = interaction.options.getString('type');
      if (type === 'all') {
        await GuildSettings.updateOne({ guildId }, { 'logging.enabled': false });
        interaction.reply({ embeds: [successEmbed('Logging', 'Logging **disabled**.')] });
      } else {
        await GuildSettings.updateOne({ guildId }, { [`logging.${type}`]: false });
        interaction.reply({ embeds: [successEmbed('Logging', `**${type}** logging disabled.`)] });
      }
    }

    if (sub === 'status') {
      const l = settings.logging;
      const types = ['messageEdit', 'messageDelete', 'memberJoin', 'memberLeave', 'voice', 'channelCreate', 'channelDelete', 'roleCreate', 'roleDelete', 'roleUpdate', 'moderation', 'serverUpdate'];
      const status = types.map(t => `${l[t] !== false ? '✅' : '❌'} ${t}`).join('\n');

      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('Logging Status')
          .addFields(
            { name: 'Status', value: l.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Channel', value: l.channelId ? `<#${l.channelId}>` : 'Not set', inline: true },
            { name: 'Ignored Channels', value: l.ignoredChannels?.length ? l.ignoredChannels.map(c => `<#${c}>`).join(', ') : 'None', inline: true },
            { name: 'Log Types', value: status, inline: false },
          )
          .setTimestamp()
        ]
      });
    }

    if (sub === 'ignore') {
      const channel = interaction.options.getChannel('channel');
      await GuildSettings.updateOne({ guildId }, { $push: { 'logging.ignoredChannels': channel.id } });
      interaction.reply({ embeds: [successEmbed('Logging', `<#${channel.id}> is now ignored from logging.`)] });
    }

    if (sub === 'unignore') {
      const channel = interaction.options.getChannel('channel');
      await GuildSettings.updateOne({ guildId }, { $pull: { 'logging.ignoredChannels': channel.id } });
      interaction.reply({ embeds: [successEmbed('Logging', `<#${channel.id}> is no longer ignored.`)] });
    }
  }
};
