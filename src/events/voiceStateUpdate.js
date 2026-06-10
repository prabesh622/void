const { EmbedBuilder } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../services/loggingService');
const Level = require('../schemas/Level');
const GuildSettings = require('../schemas/GuildSettings');

const voiceXpTrackers = new Map(); // `${guildId}-${userId}` => interval

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    const guildId = member.guild.id;
    const userId = member.id;
    const key = `${guildId}-${userId}`;

    // Joined voice channel
    if (!oldState.channel && newState.channel) {
      const settings = await GuildSettings.findOne({ guildId }).catch(() => null);
      if (settings?.leveling?.enabled) {
        const xpPerMin = settings.leveling.voiceXpPerMinute || 1;
        const interval = setInterval(async () => {
          await Level.findOneAndUpdate({ guildId, userId }, { $inc: { voiceXp: xpPerMin, xp: xpPerMin } }, { upsert: true }).catch(() => {});
        }, 60000);
        voiceXpTrackers.set(key, interval);
      }
      sendLog(client, guildId, 'voice', new EmbedBuilder().setColor(LOG_COLORS.voice).setTitle('Voice Join')
        .setDescription(`**${member.user.tag}** joined <#${newState.channel.id}>`).setTimestamp());
    }

    // Left voice channel
    if (oldState.channel && !newState.channel) {
      const interval = voiceXpTrackers.get(key);
      if (interval) { clearInterval(interval); voiceXpTrackers.delete(key); }
      sendLog(client, guildId, 'voice', new EmbedBuilder().setColor(LOG_COLORS.voice).setTitle('Voice Leave')
        .setDescription(`**${member.user.tag}** left <#${oldState.channel.id}>`).setTimestamp());
    }

    // Switched channels
    if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      sendLog(client, guildId, 'voice', new EmbedBuilder().setColor(LOG_COLORS.voice).setTitle('Voice Switch')
        .setDescription(`**${member.user.tag}** switched from <#${oldState.channel.id}> to <#${newState.channel.id}>`).setTimestamp());
    }
  }
};
