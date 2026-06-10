const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');
const { isOwner, isAdmin } = require('./owner');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin control panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!isOwner(userId) && !isAdmin(guildId, userId)) {
      return interaction.reply({ embeds: [errorEmbed('Access Denied', 'You need admin access. Ask the bot owner to grant it via `/owner`.')], ephemeral: true });
    }

    const settings = await GuildSettings.findOne({ guildId }).catch(() => null);
    const members = interaction.guild.memberCount;
    const channels = interaction.guild.channels.cache.size;
    const roles = interaction.guild.roles.cache.size;
    const emojis = interaction.guild.emojis.cache.size;
    const boosts = interaction.guild.premiumSubscriptionCount || 0;
    const boostLevel = interaction.guild.premiumTier;

    // Module status
    const mod = settings ? [
      `Moderation: ${settings.moderation?.enabled ? '✅' : '❌'}`,
      `AutoMod: ${settings.automod?.enabled ? '✅' : '❌'}`,
      `Welcome: ${settings.welcome?.enabled ? '✅' : '❌'}`,
      `Leveling: ${settings.leveling?.enabled ? '✅' : '❌'}`,
      `Economy: ${settings.economy?.enabled ? '✅' : '❌'}`,
      `Tickets: ${settings.tickets?.enabled ? '✅' : '❌'}`,
      `AI Chat: ${settings.ai?.enabled ? '✅' : '❌'}`,
      `Security: ${settings.security?.enabled ? '✅' : '❌'}`,
    ].join('\n') : 'Settings not initialized';

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle('🛡️ Admin Panel')
      .setDescription(`**Server:** ${interaction.guild.name}\n**Access Level:** ${isOwner(userId) ? '👑 Owner' : '🛡️ Admin'}`)
      .addFields(
        { name: '📊 Server Info', value: `Members: **${members}**\nChannels: **${channels}**\nRoles: **${roles}**\nEmojis: **${emojis}**\nBoosts: **${boosts}** (${boostLevel})`, inline: true },
        { name: '🔧 Modules', value: mod, inline: true },
        { name: '🛠️ Quick Actions', value: 'Use the buttons below to manage modules and server settings.', inline: false },
      )
      .setFooter({ text: `Admin Panel | ${interaction.user.tag}` })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_togglemod').setLabel('Toggle Mod').setStyle(ButtonStyle.Primary).setEmoji('⚖️'),
      new ButtonBuilder().setCustomId('admin_toggleautomod').setLabel('Toggle AutoMod').setStyle(ButtonStyle.Primary).setEmoji('🤖'),
      new ButtonBuilder().setCustomId('admin_togglewelcome').setLabel('Toggle Welcome').setStyle(ButtonStyle.Primary).setEmoji('👋'),
      new ButtonBuilder().setCustomId('admin_toggleleveling').setLabel('Toggle Leveling').setStyle(ButtonStyle.Primary).setEmoji('📈'),
      new ButtonBuilder().setCustomId('admin_refresh').setLabel('Refresh').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_toggleeconomy').setLabel('Toggle Economy').setStyle(ButtonStyle.Primary).setEmoji('💰'),
      new ButtonBuilder().setCustomId('admin_toggletickets').setLabel('Toggle Tickets').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
      new ButtonBuilder().setCustomId('admin_toggleai').setLabel('Toggle AI').setStyle(ButtonStyle.Primary).setEmoji('🧠'),
      new ButtonBuilder().setCustomId('admin_togglesecurity').setLabel('Toggle Security').setStyle(ButtonStyle.Primary).setEmoji('🔒'),
      new ButtonBuilder().setCustomId('admin_emojis').setLabel('Server Emojis').setStyle(ButtonStyle.Secondary).setEmoji('😀'),
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_purgeall').setLabel('Purge Channel').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
      new ButtonBuilder().setCustomId('admin_serverstats').setLabel('Server Stats').setStyle(ButtonStyle.Primary).setEmoji('📊'),
      new ButtonBuilder().setCustomId('admin_rolelist').setLabel('Role List').setStyle(ButtonStyle.Secondary).setEmoji('📋'),
    );

    interaction.reply({ embeds: [embed], components: [row1, row2, row3], ephemeral: true });
  },
};
