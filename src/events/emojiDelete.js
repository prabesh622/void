const { EmbedBuilder } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../services/loggingService');

module.exports = {
  name: 'emojiDelete',
  async execute(emoji, client) {
    if (!emoji.guild) return;

    const embed = new EmbedBuilder()
      .setColor(0xff4757)
      .setTitle('😀 Emoji Removed')
      .setDescription(`**Name:** \`${emoji.name}\`\n**Type:** ${emoji.animated ? 'Animated' : 'Static'}\n**ID:** \`${emoji.id}\``)
      .setTimestamp();

    sendLog(client, emoji.guild.id, 'emojiDelete', embed);
  }
};
