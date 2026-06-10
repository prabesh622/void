const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../schemas/GuildSettings');
const { sendLog, LOG_COLORS } = require('../services/loggingService');
const { replaceVariables } = require('../utils/helpers');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const settings = await GuildSettings.findOne({ guildId: member.guild.id }).catch(() => null);
    if (!settings) return;

    // Goodbye message
    if (settings.welcome?.enabled && settings.welcome?.channelId) {
      const channel = member.guild.channels.cache.get(settings.welcome.channelId);
      if (channel) {
        const msg = replaceVariables(settings.welcome.goodbyeMessage || '{user} has left the server.', {
          user: `**${member.user.tag}**`, server: member.guild.name, username: member.user.tag, membercount: member.guild.memberCount,
        });
        channel.send({ embeds: [new EmbedBuilder().setColor(0xff4757).setTitle('Goodbye').setDescription(msg).setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 })).setTimestamp()] }).catch(() => {});
      }
    }

    // Logging
    sendLog(client, member.guild.id, 'memberLeave', new EmbedBuilder().setColor(LOG_COLORS.memberLeave).setTitle('Member Left')
      .setDescription(`**${member.user.tag}** (<@${member.id}>)\nRoles: ${member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'None'}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setFooter({ text: `Members: ${member.guild.memberCount}` }).setTimestamp());
  }
};
