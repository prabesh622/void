const { EmbedBuilder } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../services/loggingService');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    sendLog(client, oldMessage.guild.id, 'messageEdit', new EmbedBuilder().setColor(LOG_COLORS.message).setTitle('Message Edited')
      .setDescription(`**Author:** ${oldMessage.author?.tag || 'Unknown'}\n**Channel:** <#${oldMessage.channel.id}>\n**Before:** ${oldMessage.content?.slice(0, 500) || 'N/A'}\n**After:** ${newMessage.content?.slice(0, 500) || 'N/A'}`)
      .setTimestamp());
  }
};
