const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('security')
    .setDescription('Configure security features')
    .addSubcommand(sub => sub
      .setName('antiraid')
      .setDescription('Configure anti-raid protection')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
      .addIntegerOption(opt => opt.setName('threshold').setDescription('Max joins before trigger').setMinValue(3).setMaxValue(100).setRequired(false))
      .addIntegerOption(opt => opt.setName('timeframe').setDescription('Time window in seconds').setMinValue(5).setMaxValue(120).setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('antinuke')
      .setDescription('Configure anti-nuke protection')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
      .addIntegerOption(opt => opt.setName('threshold').setDescription('Max deletes before trigger').setMinValue(2).setMaxValue(20).setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('scamlinks')
      .setDescription('Toggle scam link detection')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('autoban')
      .setDescription('Toggle auto-ban for security violations')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('status').setDescription('View security status'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let settings = await GuildSettings.findOne({ guildId });
    if (!settings) settings = await GuildSettings.create({ guildId });

    if (sub === 'antiraid') {
      const enabled = interaction.options.getBoolean('enabled');
      const threshold = interaction.options.getInteger('threshold') || 10;
      const timeframe = (interaction.options.getInteger('timeframe') || 10) * 1000;
      await GuildSettings.updateOne({ guildId }, { 'security.enabled': true, 'security.antiRaid': enabled, 'security.raidThreshold': threshold, 'security.raidTimeframe': timeframe });
      interaction.reply({ embeds: [successEmbed('Security', `Anti-raid **${enabled ? 'enabled' : 'disabled'}** (threshold: ${threshold} joins in ${timeframe / 1000}s).`)] });
    }

    if (sub === 'antinuke') {
      const enabled = interaction.options.getBoolean('enabled');
      const threshold = interaction.options.getInteger('threshold') || 5;
      await GuildSettings.updateOne({ guildId }, { 'security.enabled': true, 'security.antiNuke': enabled, 'security.nukeThreshold': threshold });
      interaction.reply({ embeds: [successEmbed('Security', `Anti-nuke **${enabled ? 'enabled' : 'disabled'}** (threshold: ${threshold} deletes in 30s).`)] });
    }

    if (sub === 'scamlinks') {
      const enabled = interaction.options.getBoolean('enabled');
      await GuildSettings.updateOne({ guildId }, { 'security.enabled': true, 'security.scamLinks': enabled });
      interaction.reply({ embeds: [successEmbed('Security', `Scam link detection **${enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'autoban') {
      const enabled = interaction.options.getBoolean('enabled');
      await GuildSettings.updateOne({ guildId }, { 'security.autoBan': enabled });
      interaction.reply({ embeds: [successEmbed('Security', `Auto-ban **${enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'status') {
      const s = settings.security;
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('Security Status')
          .addFields(
            { name: 'Status', value: s.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Anti-Raid', value: s.antiRaid ? `✅ (${s.raidThreshold} joins / ${s.raidTimeframe / 1000}s)` : '❌', inline: true },
            { name: 'Anti-Nuke', value: s.antiNuke ? `✅ (${s.nukeThreshold} deletes)` : '❌', inline: true },
            { name: 'Scam Links', value: s.scamLinks ? '✅' : '❌', inline: true },
            { name: 'Auto-Ban', value: s.autoBan ? '✅' : '❌', inline: true },
          )
          .setTimestamp()
        ]
      });
    }
  }
};
