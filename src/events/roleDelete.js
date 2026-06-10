const { EmbedBuilder } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../services/loggingService');
const { recordDelete, checkNuke } = require('../services/securityService');
const GuildSettings = require('../schemas/GuildSettings');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    if (!role.guild) return;
    const guildId = role.guild.id;

    // Anti-nuke tracking
    recordDelete(guildId);
    const isNuke = await checkNuke(guildId);
    if (isNuke) {
      const settings = await GuildSettings.findOne({ guildId });
      if (settings?.security?.autoBan && settings.security.logChannel) {
        const logCh = client.channels.cache.get(settings.security.logChannel);
        if (logCh) {
          logCh.send({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle('🚨 Anti-Nuke Alert').setDescription('Mass role deletion detected! This may be a nuke attack.').setTimestamp()] });
        }
      }
    }

    sendLog(client, guildId, 'roleDelete', new EmbedBuilder()
      .setColor(LOG_COLORS.role)
      .setTitle('Role Deleted')
      .setDescription(`**Role:** ${role.name}\n**Color:** ${role.hexColor}\n**Members:** ${role.members.size}\n**ID:** ${role.id}`)
      .setTimestamp());
  }
};
