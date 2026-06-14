const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');
const Level = require('../../schemas/Level');
const Ticket = require('../../schemas/Ticket');
const AILog = require('../../schemas/AILog');

const OWNER_ID = '1101811921340080148';

/** In-memory admin list per guild: guildId -> Set<userId> */
const adminList = new Map();

/** Blacklisted users (global) */
const blacklist = new Set();

/** Owner bypass flags */
const bypassFlags = new Map(); // guildId -> Set<feature>

function isOwner(userId) { return userId === OWNER_ID; }
function isAdmin(guildId, userId) { return adminList.get(guildId)?.has(userId) || false; }
function isBlacklisted(userId) { return blacklist.has(userId); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('owner')
    .setDescription('Bot owner control panel (Owner only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Access Denied', 'Only the bot owner can use this command.')], ephemeral: true });
    }

    const guildId = interaction.guild.id;
    const settings = await GuildSettings.findOne({ guildId }).catch(() => null);

    // Bot stats
    const guilds = client.guilds.cache;
    const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0);
    const totalChannels = guilds.reduce((sum, g) => sum + g.channels.cache.size, 0);
    const commands = client.commands.size;
    const uptime = Math.floor(client.uptime / 1000);
    const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;
    const ping = client.ws.ping;
    const memUsage = process.memoryUsage();
    const heap = Math.round(memUsage.heapUsed / 1024 / 1024);

    const admins = adminList.get(guildId) || new Set();
    const adminListStr = admins.size > 0 ? [...admins].map(id => `<@${id}>`).join(', ') : 'None';
    const blacklistStr = blacklist.size > 0 ? `${blacklist.size} user(s)` : 'None';

    // Bypass status
    const guildBypass = bypassFlags.get(guildId) || new Set();
    const bypassStr = guildBypass.size > 0 ? [...guildBypass].join(', ') : 'None active';

    const embed = new EmbedBuilder()
      .setColor(0xff0055)
      .setTitle('👑 Owner Control Panel')
      .setDescription(`**Bot Owner:** <@${OWNER_ID}>\n**Server:** ${interaction.guild.name}`)
      .addFields(
        { name: '📊 Bot Stats', value: `Servers: **${guilds.size}**\nMembers: **${totalMembers}**\nChannels: **${totalChannels}**\nCommands: **${commands}**\nPing: **${ping}ms**\nMemory: **${heap}MB**\nUptime: **${uptimeStr}**`, inline: true },
        { name: '🔧 This Server', value: `Settings: ${settings ? '✅' : '❌'}\nMembers: **${interaction.guild.memberCount}**\nRoles: **${interaction.guild.roles.cache.size}**\nChannels: **${interaction.guild.channels.cache.size}**\nEmojis: **${interaction.guild.emojis.cache.size}**`, inline: true },
        { name: '🛡️ Protection', value: `Admins: ${adminListStr}\nBlacklist: ${blacklistStr}\nBypass: ${bypassStr}`, inline: false },
        { name: '🤖 AI Status', value: `AI Enabled: ${settings?.ai?.enabled ? '✅' : '❌'}\nAI Channels: ${settings?.ai?.channels?.length || 0}\nPersonality: ${settings?.ai?.personality || 'default'}`, inline: true },
      )
      .setFooter({ text: `Owner Panel | ${interaction.user.tag}` })
      .setTimestamp();

    // Row 1: Server management
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('owner_servers').setLabel('Servers').setStyle(ButtonStyle.Primary).setEmoji('📋'),
      new ButtonBuilder().setCustomId('owner_addadmin').setLabel('Add Admin').setStyle(ButtonStyle.Success).setEmoji('➕'),
      new ButtonBuilder().setCustomId('owner_deladmin').setLabel('Remove Admin').setStyle(ButtonStyle.Danger).setEmoji('➖'),
      new ButtonBuilder().setCustomId('owner_shutdown').setLabel('Shutdown').setStyle(ButtonStyle.Danger).setEmoji('🔌'),
      new ButtonBuilder().setCustomId('owner_refresh').setLabel('Refresh').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
    );

    // Row 2: Advanced features
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('owner_broadcast').setLabel('Broadcast').setStyle(ButtonStyle.Primary).setEmoji('📢'),
      new ButtonBuilder().setCustomId('owner_userinfo').setLabel('User Lookup').setStyle(ButtonStyle.Secondary).setEmoji('🔍'),
      new ButtonBuilder().setCustomId('owner_stats').setLabel('Full Stats').setStyle(ButtonStyle.Primary).setEmoji('📈'),
      new ButtonBuilder().setCustomId('owner_resetsettings').setLabel('Reset Settings').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
    );

    // Row 3: New features - AI, Blacklist, Bypass, Logs
    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('owner_blacklist').setLabel('Blacklist').setStyle(ButtonStyle.Danger).setEmoji('🚫'),
      new ButtonBuilder().setCustomId('owner_unblacklist').setLabel('Unblacklist').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('owner_bypass').setLabel('Bypass Toggle').setStyle(ButtonStyle.Primary).setEmoji('⚡'),
      new ButtonBuilder().setCustomId('owner_ailogs').setLabel('AI Logs').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
      new ButtonBuilder().setCustomId('owner_exec').setLabel('Execute').setStyle(ButtonStyle.Danger).setEmoji('💻'),
    );

    // Row 4: Quick toggles
    const row4 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('owner_toggleai').setLabel('Toggle AI').setStyle(ButtonStyle.Primary).setEmoji('🤖'),
      new ButtonBuilder().setCustomId('owner_togglelevel').setLabel('Toggle Levels').setStyle(ButtonStyle.Primary).setEmoji('📊'),
      new ButtonBuilder().setCustomId('owner_reloadcmds').setLabel('Reload Commands').setStyle(ButtonStyle.Success).setEmoji('🔃'),
      new ButtonBuilder().setCustomId('owner_dm').setLabel('DM User').setStyle(ButtonStyle.Secondary).setEmoji('💬'),
    );

    interaction.reply({ embeds: [embed], components: [row1, row2, row3, row4], ephemeral: true });
  },

  isOwner,
  isAdmin,
  adminList,
  blacklist,
  bypassFlags,
  isBlacklisted,
  OWNER_ID,
};
