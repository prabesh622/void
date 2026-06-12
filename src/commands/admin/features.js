const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed, COLORS, ICONS, panelEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');
const { isOwner, isAdmin } = require('./owner');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('features')
    .setDescription('Enable or disable commands and categories')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('status').setDescription('View feature status'))
    .addSubcommand(s => s.setName('toggle')
      .setDescription('Toggle a category on/off')
      .addStringOption(o => o.setName('category').setDescription('Category to toggle').setRequired(true)
        .addChoices(
          { name: 'Fun', value: 'fun' },
          { name: 'AI', value: 'ai' },
          { name: 'Game', value: 'game' },
          { name: 'Music', value: 'music' },
          { name: 'Utility', value: 'utility' },
          { name: 'Economy', value: 'economy' },
          { name: 'Moderation', value: 'moderation' },
          { name: 'Admin', value: 'admin' },
          { name: 'Leveling', value: 'leveling' },
        )))
    .addSubcommand(s => s.setName('command')
      .setDescription('Toggle a specific command on/off')
      .addStringOption(o => o.setName('name').setDescription('Command name (without /)').setRequired(true))),

  async execute(interaction, client) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!isOwner(userId) && !isAdmin(guildId, userId)) {
      return interaction.reply({ embeds: [errorEmbed('Access Denied', 'You need admin access.')], ephemeral: true });
    }

    const settings = await GuildSettings.findOne({ guildId }) || await GuildSettings.create({ guildId });
    const sub = interaction.options.getSubcommand();

    // ── STATUS ──
    if (sub === 'status') {
      const disabledCommands = settings.disabledCommands || [];
      const disabledCategories = settings.disabledCategories || [];

      // Build category list
      const categories = {};
      for (const [, cmd] of client.commands) {
        const cat = cmd.data?.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd.data.name);
      }

      const catEmojis = {
        fun: '🎮', ai: '🤖', game: '🎯', music: '🎵',
        utility: '🔧', economy: '💰', moderation: '🛡️', admin: '⚙️',
        leveling: '📊', security: '🔒', other: '📦',
      };

      const lines = Object.entries(categories).map(([cat, cmds]) => {
        const disabled = disabledCategories.includes(cat);
        const status = disabled ? '🔴' : '🟢';
        const emoji = catEmojis[cat] || '📦';
        const disabledCmds = cmds.filter(c => disabledCommands.includes(c));
        let line = `${status} ${emoji} **${cat.toUpperCase()}** (${cmds.length} cmds)`;
        if (disabled) line += ' — **DISABLED**';
        if (disabledCmds.length > 0 && !disabled) line += `\n   └ Disabled: ${disabledCmds.map(c => `\`${c}\``).join(', ')}`;
        return line;
      });

      const embed = panelEmbed({
        title: '📋 Feature Status',
        description: lines.join('\n'),
        color: COLORS.admin,
        fields: [
          { name: '🔴 Disabled Categories', value: disabledCategories.length ? disabledCategories.map(c => `\`${c}\``).join(', ') : 'None', inline: true },
          { name: '🔒 Disabled Commands', value: disabledCommands.length ? disabledCommands.map(c => `\`/${c}\``).join(', ') : 'None', inline: true },
        ],
        footer: `Server: ${interaction.guild.name}`,
      });

      // Action buttons
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('feat_enable_all').setLabel('Enable All').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('feat_disable_fun').setLabel('Disable Fun').setStyle(ButtonStyle.Secondary).setEmoji('🎮'),
        new ButtonBuilder().setCustomId('feat_disable_game').setLabel('Disable Games').setStyle(ButtonStyle.Secondary).setEmoji('🎯'),
        new ButtonBuilder().setCustomId('feat_disable_music').setLabel('Disable Music').setStyle(ButtonStyle.Secondary).setEmoji('🎵'),
        new ButtonBuilder().setCustomId('feat_refresh').setLabel('Refresh').setStyle(ButtonStyle.Primary).setEmoji('🔄'),
      );

      return interaction.reply({ embeds: [embed], components: [row1], ephemeral: true });
    }

    // ── TOGGLE CATEGORY ──
    if (sub === 'toggle') {
      const category = interaction.options.getString('category');
      const disabledCategories = settings.disabledCategories || [];

      if (disabledCategories.includes(category)) {
        await GuildSettings.updateOne({ guildId }, { $pull: { disabledCategories: category } });
        return interaction.reply({ embeds: [successEmbed('Category Enabled', `The **${category}** category has been **enabled** ✅`)], ephemeral: true });
      } else {
        await GuildSettings.updateOne({ guildId }, { $push: { disabledCategories: category } });
        return interaction.reply({ embeds: [successEmbed('Category Disabled', `The **${category}** category has been **disabled** 🔴`)], ephemeral: true });
      }
    }

    // ── TOGGLE COMMAND ──
    if (sub === 'command') {
      const name = interaction.options.getString('name').toLowerCase();
      const cmd = client.commands.get(name);
      if (!cmd) return interaction.reply({ embeds: [errorEmbed('Not Found', `Command \`/${name}\` does not exist.`)], ephemeral: true });

      const disabledCommands = settings.disabledCommands || [];
      if (disabledCommands.includes(name)) {
        await GuildSettings.updateOne({ guildId }, { $pull: { disabledCommands: name } });
        return interaction.reply({ embeds: [successEmbed('Command Enabled', `\`/${name}\` has been **enabled** ✅`)], ephemeral: true });
      } else {
        await GuildSettings.updateOne({ guildId }, { $push: { disabledCommands: name } });
        return interaction.reply({ embeds: [successEmbed('Command Disabled', `\`/${name}\` has been **disabled** 🔴`)], ephemeral: true });
      }
    }
  },
};
