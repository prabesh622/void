const { EmbedBuilder } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../services/loggingService');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;
    sendLog(client, message.guild.id, 'messageDelete', new EmbedBuilder().setColor(0xff4757).setTitle('Message Deleted')
      .setDescription(`**Author:** ${message.author?.tag || 'Unknown'}\n**Channel:** <#${message.channel.id}>\n**Content:** ${message.content?.slice(0, 500) || '[embed/attachment]'}`)
      .setTimestamp());
  }
};
