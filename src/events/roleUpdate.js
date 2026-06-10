const { EmbedBuilder } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../services/loggingService');

module.exports = {
  name: 'roleUpdate',
  async execute(oldRole, newRole, client) {
    if (!oldRole.guild) return;
    const changes = [];

    if (oldRole.name !== newRole.name) changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
    if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (oldRole.hoist !== newRole.hoist) changes.push(`**Hoisted:** ${oldRole.hoist ? 'Yes' : 'No'} → ${newRole.hoist ? 'Yes' : 'No'}`);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`**Mentionable:** ${oldRole.mentionable ? 'Yes' : 'No'} → ${newRole.mentionable ? 'Yes' : 'No'}`);
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('**Permissions:** Changed');
    if (oldRole.position !== newRole.position) changes.push(`**Position:** ${oldRole.position} → ${newRole.position}`);

    if (changes.length === 0) return;

    sendLog(client, oldRole.guild.id, 'roleUpdate', new EmbedBuilder()
      .setColor(LOG_COLORS.role)
      .setTitle('Role Updated')
      .setDescription(`**Role:** <@&${newRole.id}> (${newRole.name})\n${changes.join('\n')}`)
      .setTimestamp());
  }
};
