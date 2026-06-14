const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed, COLORS, panelEmbed, moduleList } = require('../../utils/embeds');
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

    // ── Server Stats ──
    const members = interaction.guild.memberCount;
    const online = interaction.guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
    const bots = interaction.guild.members.cache.filter(m => m.user.bot).size;
    const channels = interaction.guild.channels.cache.size;
    const roles = interaction.guild.roles.cache.size;
    const emojis = interaction.guild.emojis.cache.size;
    const boosts = interaction.guild.premiumSubscriptionCount || 0;
    const boostLevel = interaction.guild.premiumTier;

    // ── Module Status ──
    const modules = settings ? [
      { name: 'Moderation', emoji: '⚖️', enabled: settings.moderation?.enabled },
      { name: 'AutoMod', emoji: '🤖', enabled: settings.automod?.enabled },
      { name: 'Welcome', emoji: '👋', enabled: settings.welcome?.enabled },
      { name: 'Leveling', emoji: '📈', enabled: settings.leveling?.enabled },
      { name: 'Economy', emoji: '💰', enabled: settings.economy?.enabled },
      { name: 'Tickets', emoji: '🎫', enabled: settings.tickets?.enabled },
      { name: 'AI Chat', emoji: '🧠', enabled: settings.ai?.enabled },
      { name: 'AI Warn', emoji: '🚨', enabled: settings.aiWarning?.enabled },
      { name: 'Security', emoji: '🔒', enabled: settings.security?.enabled },
      { name: 'Logging', emoji: '📝', enabled: settings.logging?.enabled },
    ] : [];

    const disabledCommands = settings?.disabledCommands || [];
    const disabledCategories = settings?.disabledCategories || [];

    // ── Build Embed ──
    const embed = new EmbedBuilder()
      .setColor(COLORS.admin)
      .setTitle('🛡️ Server Control Panel')
      .setDescription(
        `> **Server:** ${interaction.guild.name}\n` +
        `> **Access:** ${isOwner(userId) ? '👑 Owner' : '🛡️ Admin'}\n` +
        `> **Disabled:** ${disabledCategories.length} categories, ${disabledCommands.length} commands`
      )
      .addFields(
        {
          name: '📊 Server Overview',
          value: [
            `👥 **${members}** members (${online} online)`,
            `🤖 **${bots}** bots`,
            `💬 **${channels}** channels`,
            `🎭 **${roles}** roles`,
            `😀 **${emojis}** emojis`,
            `🚀 **${boosts}** boosts (Tier ${boostLevel})`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🔧 Module Status',
          value: settings ? modules.map(m => `${m.enabled ? '🟢' : '🔴'} ${m.emoji} **${m.name}**`).join('\n') : 'Not initialized',
          inline: true,
        },
        {
          name: '⚡ Quick Actions',
          value: [
            '• Use **/features status** to see all commands',
            '• Use **/features toggle** to enable/disable categories',
            '• Use **/features command** to toggle individual commands',
            '• Buttons below toggle core modules',
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: `Admin Panel • ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp()
      .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }));

    // ── Row 1: Core Module Toggles ──
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_togglemod').setLabel('Moderation').setStyle(settings?.moderation?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('⚖️'),
      new ButtonBuilder().setCustomId('admin_toggleautomod').setLabel('AutoMod').setStyle(settings?.automod?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('🤖'),
      new ButtonBuilder().setCustomId('admin_togglewelcome').setLabel('Welcome').setStyle(settings?.welcome?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('👋'),
      new ButtonBuilder().setCustomId('admin_toggleleveling').setLabel('Leveling').setStyle(settings?.leveling?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('📈'),
      new ButtonBuilder().setCustomId('admin_refresh').setLabel('Refresh').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
    );

    // ── Row 2: Other Module Toggles ──
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_toggleeconomy').setLabel('Economy').setStyle(settings?.economy?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('💰'),
      new ButtonBuilder().setCustomId('admin_toggletickets').setLabel('Tickets').setStyle(settings?.tickets?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('🎫'),
      new ButtonBuilder().setCustomId('admin_toggleai').setLabel('AI Chat').setStyle(settings?.ai?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('🧠'),
      new ButtonBuilder().setCustomId('admin_toggleaiwarn').setLabel('AI Warn').setStyle(settings?.aiWarning?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('🚨'),
      new ButtonBuilder().setCustomId('admin_features').setLabel('Features').setStyle(ButtonStyle.Primary).setEmoji('📋'),
    );

    // ── Row 3: Utility Actions ──
    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_togglesecurity').setLabel('Security').setStyle(settings?.security?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('🔒'),
      new ButtonBuilder().setCustomId('admin_purgeall').setLabel('Purge Channel').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
      new ButtonBuilder().setCustomId('admin_serverstats').setLabel('Server Stats').setStyle(ButtonStyle.Primary).setEmoji('📊'),
      new ButtonBuilder().setCustomId('admin_rolelist').setLabel('Role List').setStyle(ButtonStyle.Secondary).setEmoji('📋'),
      new ButtonBuilder().setCustomId('admin_channels').setLabel('Channels').setStyle(ButtonStyle.Primary).setEmoji('💬'),
    );

    interaction.reply({ embeds: [embed], components: [row1, row2, row3], ephemeral: true });
  },
};
