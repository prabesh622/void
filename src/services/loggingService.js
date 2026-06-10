const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../schemas/GuildSettings');
const Log = require('../schemas/Log');

const LOG_COLORS = {
  message: 0x3b82f6, member: 0x00d26a, memberLeave: 0xff4757,
  voice: 0x9b59b6, channel: 0xf39c12, role: 0xe74c3c,
  moderation: 0xff0000, server: 0x2c3e50,
};

/** Send a log embed to the guild's log channel */
async function sendLog(client, guildId, type, embed) {
  try {
    const settings = await GuildSettings.findOne({ guildId });
    if (!settings?.logging?.enabled) return;
    if (!settings.logging[type]) return;

    const channelId = settings.logging.channelId;
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId);
    if (!channel) return;

    await channel.send({ embeds: [embed] });

    // Save to DB
    await Log.create({ guildId, type, details: { embed: embed.toJSON() } }).catch(() => {});
  } catch (err) {
    // Silent fail for logging
  }
}

/** Check if a channel or role should be ignored */
function isIgnored(settings, channelId, roleIds = []) {
  if (!settings?.logging) return false;
  if (settings.logging.ignoredChannels?.includes(channelId)) return true;
  if (roleIds.some(r => settings.logging.ignoredRoles?.includes(r))) return true;
  return false;
}

module.exports = { sendLog, isIgnored, LOG_COLORS };
