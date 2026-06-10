const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');
const Level = require('../../schemas/Level');
const Economy = require('../../schemas/Economy');
const Ticket = require('../../schemas/Ticket');

const OWNER_ID = '1101811921340080148';

/** In-memory admin list per guild: guildId -> Set<userId> */
const adminList = new Map();

function isOwner(userId) { return userId === OWNER_ID; }
function isAdmin(guildId, userId) { return adminList.get(guildId)?.has(userId) || false; }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('owner')
    .setDescription('Bot owner control panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Access Denied', 'Only the bot owner can use this command.')], ephemeral: true });
    }

    const guildId = interaction.guild.id;

    // Build owner panel
    const guilds = client.guilds.cache;
    const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0);
    const totalChannels = guilds.reduce((sum, g) => sum + g.channels.cache.size, 0);
    const commands = client.commands.size;
    const uptime = Math.floor(client.uptime / 1000);
    const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;
    const ping = client.ws.ping;

    const admins = adminList.get(guildId) || new Set();
    const adminListStr = admins.size > 0
      ? [...admins].map(id => `<@${id}>`).join(', ')
      : 'None assigned';

    const settings = await GuildSettings.findOne({ guildId }).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(0xff0055)
      .setTitle('👑 Owner Panel')
      .setDescription(`**Bot Owner:** <@${OWNER_ID}>\n**Current Server:** ${interaction.guild.name}`)
      .addFields(
        { name: '📊 Bot Stats', value: `Servers: **${guilds.size}**\nMembers: **${totalMembers}**\nChannels: **${totalChannels}**\nCommands: **${commands}**\nPing: **${ping}ms**\nUptime: **${uptimeStr}**`, inline: true },
        { name: '🔧 This Server', value: `Settings: ${settings ? '✅' : '❌'}\nMembers: **${interaction.guild.memberCount}**\nRoles: **${interaction.guild.roles.cache.size}**\nChannels: **${interaction.guild.channels.cache.size}**\nEmojis: **${interaction.guild.emojis.cache.size}**`, inline: true },
        { name: '🛡️ Admins', value: adminListStr, inline: false },
      )
      .setFooter({ text: `Owner Panel | ${interaction.user.tag}` })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('owner_servers').setLabel('Server List').setStyle(ButtonStyle.Primary).setEmoji('📋'),
      new ButtonBuilder().setCustomId('owner_addadmin').setLabel('Add Admin').setStyle(ButtonStyle.Success).setEmoji('➕'),
      new ButtonBuilder().setCustomId('owner_deladmin').setLabel('Remove Admin').setStyle(ButtonStyle.Danger).setEmoji('➖'),
      new ButtonBuilder().setCustomId('owner_shutdown').setLabel('Shutdown').setStyle(ButtonStyle.Danger).setEmoji('🔌'),
      new ButtonBuilder().setCustomId('owner_refresh').setLabel('Refresh').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('owner_resetsettings').setLabel('Reset Settings').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
      new ButtonBuilder().setCustomId('owner_broadcast').setLabel('Broadcast').setStyle(ButtonStyle.Primary).setEmoji('📢'),
      new ButtonBuilder().setCustomId('owner_userinfo').setLabel('User Lookup').setStyle(ButtonStyle.Secondary).setEmoji('🔍'),
      new ButtonBuilder().setCustomId('owner_stats').setLabel('Full Stats').setStyle(ButtonStyle.Primary).setEmoji('📈'),
    );

    interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
  },

  isOwner,
  isAdmin,
  adminList,
  OWNER_ID,
};
