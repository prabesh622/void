const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure auto-moderation settings')
    .addSubcommand(sub => sub.setName('view').setDescription('View current automod settings'))
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable or disable automod').addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(sub => sub.setName('antispam').setDescription('Toggle anti-spam protection').addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(sub => sub.setName('antilink').setDescription('Toggle anti-link filter').addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(sub => sub.setName('anticaps').setDescription('Toggle anti-caps filter').addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(sub => sub.setName('antimention').setDescription('Toggle anti-mention spam').addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true)).addIntegerOption(opt => opt.setName('limit').setDescription('Max mentions allowed').setMinValue(1).setMaxValue(20).setRequired(false)))
    .addSubcommand(sub => sub.setName('badwords').setDescription('Set bad words filter (comma-separated)').addStringOption(opt => opt.setName('words').setDescription('Comma-separated list of bad words').setRequired(true)))
    .addSubcommand(sub => sub.setName('logchannel').setDescription('Set the automod log channel').addChannelOption(opt => opt.setName('channel').setDescription('The log channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let settings = await GuildSettings.findOne({ guildId });
    if (!settings) settings = await GuildSettings.create({ guildId });

    if (sub === 'view') {
      const a = settings.automod;
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('AutoMod Settings')
          .addFields(
            { name: 'Status', value: a.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Anti-Spam', value: a.antiSpam ? '✅' : '❌', inline: true },
            { name: 'Anti-Link', value: a.antiLink ? '✅' : '❌', inline: true },
            { name: 'Anti-Caps', value: a.antiCaps ? `✅ (${a.capsThreshold}%)` : '❌', inline: true },
            { name: 'Anti-Mention', value: a.antiMentionSpam ? `✅ (${a.mentionSpamLimit})` : '❌', inline: true },
            { name: 'Bad Words', value: a.badWords?.length ? a.badWords.join(', ') : 'None', inline: false },
            { name: 'Log Channel', value: a.logChannel ? `<#${a.logChannel}>` : 'Not set', inline: true },
          )
          .setTimestamp()
        ]
      });
    }

    if (sub === 'enable') {
      const enabled = interaction.options.getBoolean('enabled');
      await GuildSettings.updateOne({ guildId }, { 'automod.enabled': enabled });
      interaction.reply({ embeds: [successEmbed('AutoMod', `Automod has been **${enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'antispam') {
      const enabled = interaction.options.getBoolean('enabled');
      await GuildSettings.updateOne({ guildId }, { 'automod.antiSpam': enabled });
      interaction.reply({ embeds: [successEmbed('AutoMod', `Anti-spam has been **${enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'antilink') {
      const enabled = interaction.options.getBoolean('enabled');
      await GuildSettings.updateOne({ guildId }, { 'automod.antiLink': enabled });
      interaction.reply({ embeds: [successEmbed('AutoMod', `Anti-link has been **${enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'anticaps') {
      const enabled = interaction.options.getBoolean('enabled');
      await GuildSettings.updateOne({ guildId }, { 'automod.antiCaps': enabled });
      interaction.reply({ embeds: [successEmbed('AutoMod', `Anti-caps has been **${enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'antimention') {
      const enabled = interaction.options.getBoolean('enabled');
      const limit = interaction.options.getInteger('limit') || 5;
      await GuildSettings.updateOne({ guildId }, { 'automod.antiMentionSpam': enabled, 'automod.mentionSpamLimit': limit });
      interaction.reply({ embeds: [successEmbed('AutoMod', `Anti-mention spam **${enabled ? 'enabled' : 'disabled'}** (limit: ${limit}).`)] });
    }

    if (sub === 'badwords') {
      const words = interaction.options.getString('words').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
      await GuildSettings.updateOne({ guildId }, { 'automod.badWords': words });
      interaction.reply({ embeds: [successEmbed('AutoMod', `Bad words filter updated: \`${words.join(', ')}\``)] });
    }

    if (sub === 'logchannel') {
      const channel = interaction.options.getChannel('channel');
      await GuildSettings.updateOne({ guildId }, { 'automod.logChannel': channel.id });
      interaction.reply({ embeds: [successEmbed('AutoMod', `Log channel set to <#${channel.id}>.`)] });
    }
  }
};
