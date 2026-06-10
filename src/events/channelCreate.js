const { EmbedBuilder, ChannelType } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../services/loggingService');
const GuildSettings = require('../schemas/GuildSettings');
const ticketAI = require('../services/ticketAIService');

const CHANNEL_TYPES = {
  0: 'Text', 2: 'Voice', 4: 'Category', 5: 'Announcement',
  10: 'Announcement Thread', 11: 'Public Thread', 12: 'Private Thread',
  13: 'Stage', 14: 'Directory', 15: 'Forum',
};

/** Channels pending triage (waiting for first user message) */
const pendingTriage = new Map(); // channelId -> guildId

module.exports = {
  name: 'channelCreate',
  async execute(channel, client) {
    if (!channel.guild) return;
    const type = CHANNEL_TYPES[channel.type] || 'Unknown';

    // Logging
    sendLog(client, channel.guild.id, 'channelCreate', new EmbedBuilder()
      .setColor(LOG_COLORS.channel)
      .setTitle('Channel Created')
      .setDescription(`**Channel:** <#${channel.id}> (${channel.name})\n**Type:** ${type}\n**ID:** ${channel.id}`)
      .setTimestamp());

    // === AI TICKET TRIAGE: Detect new ticket channels ===
    if (channel.type !== ChannelType.GuildText) return;

    const settings = await GuildSettings.findOne({ guildId: channel.guild.id }).catch(() => null);
    if (!settings?.ticketAI?.enabled) return;

    const tAI = settings.ticketAI;

    // Check if channel matches category or name patterns
    const matchesCategory = tAI.categoryId && channel.parentId === tAI.categoryId;
    const matchesPattern = ticketAI.isTicketChannel(channel.name, tAI.channelPatterns || ['ticket-']);

    if (matchesCategory || matchesPattern) {
      // Mark channel as pending triage — will start when first user message appears
      pendingTriage.set(channel.id, channel.guild.id);
      console.log(`[TicketAI] Detected ticket channel: #${channel.name} — waiting for user message`);
    }
  },
  pendingTriage,
};
