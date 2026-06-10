const { EmbedBuilder } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../services/loggingService');

module.exports = {
  name: 'roleCreate',
  async execute(role, client) {
    if (!role.guild) return;

    sendLog(client, role.guild.id, 'roleCreate', new EmbedBuilder()
      .setColor(LOG_COLORS.role)
      .setTitle('Role Created')
      .setDescription(`**Role:** <@&${role.id}> (${role.name})\n**Color:** ${role.hexColor}\n**Hoisted:** ${role.hoist ? 'Yes' : 'No'}\n**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}\n**ID:** ${role.id}`)
      .setTimestamp());
  }
};
