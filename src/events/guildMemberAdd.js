const { EmbedBuilder } = require('discord.js');
const GuildSettings = require('../schemas/GuildSettings');
const securityService = require('../services/securityService');
const { sendLog, LOG_COLORS } = require('../services/loggingService');
const { replaceVariables } = require('../utils/helpers');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const settings = await GuildSettings.findOne({ guildId: member.guild.id }).catch(() => null);
    if (!settings) return;

    // Anti-alt check
    if (settings.verification?.antiAlt && settings.verification?.minAccountAge > 0) {
      const ageDays = (Date.now() - member.user.createdTimestamp) / 86400000;
      if (ageDays < settings.verification.minAccountAge) {
        if (settings.security?.autoBan) {
          await member.kick('Account too new (anti-alt)').catch(() => {});
          sendLog(client, member.guild.id, 'member', new EmbedBuilder().setColor(LOG_COLORS.memberLeave).setTitle('Member Kicked (Anti-Alt)').setDescription(`**${member.user.tag}** kicked — account age: ${Math.floor(ageDays)} days`).setTimestamp());
        }
        return;
      }
    }

    // Anti-raid check
    if (settings.security?.antiRaid) {
      const isRaid = await securityService.checkRaid(member.guild.id);
      if (isRaid && settings.security.autoBan) {
        await member.ban('Anti-raid detection').catch(() => {});
        sendLog(client, member.guild.id, 'member', new EmbedBuilder().setColor(LOG_COLORS.memberLeave).setTitle('Member Banned (Anti-Raid)').setDescription(`**${member.user.tag}** banned by anti-raid`).setTimestamp());
        return;
      }
    }

    // Auto-role
    if (settings.welcome?.autoRole && !settings.verification?.enabled) {
      const role = member.guild.roles.cache.get(settings.welcome.autoRole);
      if (role) await member.roles.add(role).catch(() => {});
    }

    // Welcome message
    if (settings.welcome?.enabled && settings.welcome?.channelId) {
      const channel = member.guild.channels.cache.get(settings.welcome.channelId);
      if (channel) {
        const msg = replaceVariables(settings.welcome.welcomeMessage || 'Welcome {user} to {server}!', {
          user: `<@${member.id}>`, server: member.guild.name, username: member.user.tag, membercount: member.guild.memberCount,
        });
        const embed = new EmbedBuilder().setColor(0x00d26a).setTitle('Welcome!').setDescription(msg)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setFooter({ text: `Member #${member.guild.memberCount}` }).setTimestamp();
        channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // Logging
    sendLog(client, member.guild.id, 'memberJoin', new EmbedBuilder().setColor(LOG_COLORS.member).setTitle('Member Joined')
      .setDescription(`**${member.user.tag}** (<@${member.id}>)\nAccount created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setFooter({ text: `Members: ${member.guild.memberCount}` }).setTimestamp());
  }
};
