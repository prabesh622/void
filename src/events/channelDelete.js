const { EmbedBuilder } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../services/loggingService');
const { recordDelete, checkNuke } = require('../services/securityService');
const GuildSettings = require('../schemas/GuildSettings');

const CHANNEL_TYPES = {
  0: 'Text', 2: 'Voice', 4: 'Category', 5: 'Announcement',
  10: 'Announcement Thread', 11: 'Public Thread', 12: 'Private Thread',
  13: 'Stage', 14: 'Directory', 15: 'Forum',
};

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel.guild) return;
    const guildId = channel.guild.id;
    const type = CHANNEL_TYPES[channel.type] || 'Unknown';

    // Anti-nuke tracking
    recordDelete(guildId);
    const isNuke = await checkNuke(guildId);
    if (isNuke) {
      const settings = await GuildSettings.findOne({ guildId });
      if (settings?.security?.autoBan && settings.security.logChannel) {
        const logCh = client.channels.cache.get(settings.security.logChannel);
        if (logCh) {
          logCh.send({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle('🚨 Anti-Nuke Alert').setDescription('Mass channel deletion detected! This may be a nuke attack.').setTimestamp()] });
        }
      }
    }

    sendLog(client, guildId, 'channelDelete', new EmbedBuilder()
      .setColor(LOG_COLORS.channel)
      .setTitle('Channel Deleted')
      .setDescription(`**Channel:** ${channel.name}\n**Type:** ${type}\n**ID:** ${channel.id}`)
      .setTimestamp());
  }
};
