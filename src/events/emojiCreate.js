const { EmbedBuilder } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../services/loggingService');

module.exports = {
  name: 'emojiCreate',
  async execute(emoji, client) {
    if (!emoji.guild) return;

    const embed = new EmbedBuilder()
      .setColor(0x00d26a)
      .setTitle('😀 New Emoji Added')
      .setDescription(`**Emoji:** ${emoji}\n**Name:** \`${emoji.name}\`\n**Type:** ${emoji.animated ? 'Animated' : 'Static'}\n**ID:** \`${emoji.id}\`\n**Added by:** Unknown (check Audit Log)`)
      .setThumbnail(emoji.imageURL())
      .setTimestamp();

    sendLog(client, emoji.guild.id, 'emojiCreate', embed);

    // Also send in the first available channel as a fun notification
    const channel = emoji.guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(client.user)?.has('SendMessages'));
    if (channel) {
      channel.send({
        embeds: [new EmbedBuilder()
          .setColor(0x00d26a)
          .setDescription(`🎉 New emoji detected! ${emoji} **${emoji.name}** has been added to the server!`)
        ]
      }).catch(() => {});
    }
  }
};
