const { EmbedBuilder } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../services/loggingService');

module.exports = {
  name: 'guildUpdate',
  async execute(oldGuild, newGuild, client) {
    const changes = [];

    if (oldGuild.name !== newGuild.name) changes.push(`**Name:** ${oldGuild.name} → ${newGuild.name}`);
    if (oldGuild.iconURL() !== newGuild.iconURL()) changes.push(`**Icon:** Changed`);
    if (oldGuild.bannerURL() !== newGuild.bannerURL()) changes.push(`**Banner:** Changed`);
    if (oldGuild.description !== newGuild.description) changes.push(`**Description:** Changed`);
    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) changes.push(`**Vanity URL:** ${oldGuild.vanityURLCode || 'None'} → ${newGuild.vanityURLCode || 'None'}`);
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push(`**Verification Level:** ${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`);
    if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) changes.push(`**Explicit Filter:** Changed`);
    if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) changes.push(`**Notifications:** Changed`);
    if (oldGuild.afkChannelId !== newGuild.afkChannelId) changes.push(`**AFK Channel:** Changed`);
    if (oldGuild.afkTimeout !== newGuild.afkTimeout) changes.push(`**AFK Timeout:** ${oldGuild.afkTimeout}s → ${newGuild.afkTimeout}s`);
    if (oldGuild.systemChannelId !== newGuild.systemChannelId) changes.push(`**System Channel:** Changed`);
    if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled) changes.push(`**Boost Bar:** ${oldGuild.premiumProgressBarEnabled ? 'On' : 'Off'} → ${newGuild.premiumProgressBarEnabled ? 'On' : 'Off'}`);

    if (changes.length === 0) return;

    sendLog(client, newGuild.id, 'serverUpdate', new EmbedBuilder()
      .setColor(LOG_COLORS.server)
      .setTitle('Server Updated')
      .setDescription(changes.join('\n'))
      .setTimestamp());
  }
};
