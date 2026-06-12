const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS, ICONS, panelEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands')
    .addStringOption(o => o.setName('category').setDescription('View a specific category').setRequired(false)
      .addChoices(
        { name: '🛡️ Moderation', value: 'moderation' },
        { name: '⚙️ Admin', value: 'admin' },
        { name: '🔧 Utility', value: 'utility' },
        { name: '🎮 Fun', value: 'fun' },
        { name: '🤖 AI', value: 'ai' },
        { name: '🎯 Game', value: 'game' },
        { name: '🎵 Music', value: 'music' },
        { name: '💰 Economy', value: 'economy' },
        { name: '📊 Leveling', value: 'leveling' },
        { name: '🎫 Tickets', value: 'tickets' },
      )),

  async execute(interaction, client) {
    const category = interaction.options.getString('category');

    // Build categories from loaded commands
    const categories = {};
    for (const [, cmd] of client.commands) {
      const cat = cmd.data?.category || 'other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({
        name: cmd.data.name,
        desc: cmd.data.description || 'No description',
      });
    }

    const catEmojis = {
      fun: '🎮', ai: '🤖', game: '🎯', music: '🎵',
      utility: '🔧', economy: '💰', moderation: '🛡️', admin: '⚙️',
      leveling: '📊', security: '🔒', other: '📦', tickets: '🎫',
    };

    const catColors = {
      fun: COLORS.fun, ai: COLORS.ai, game: COLORS.game, music: COLORS.music,
      utility: COLORS.info, economy: COLORS.economy, moderation: COLORS.mod, admin: COLORS.admin,
      leveling: COLORS.premium, security: COLORS.error, other: COLORS.default, tickets: COLORS.ticket,
    };

    // ── Category-specific view ──
    if (category) {
      const cmds = categories[category] || [];
      if (cmds.length === 0) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle('❌ No Commands').setDescription(`No commands found in the **${category}** category.`).setTimestamp()],
          ephemeral: true,
        });
      }

      const emoji = catEmojis[category] || '📦';
      const lines = cmds.map(c => `> \`/${c.name}\` — ${c.desc}`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(catColors[category] || COLORS.default)
        .setTitle(`${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
        .setDescription(lines)
        .addFields({ name: '📊 Total', value: `${cmds.length} commands`, inline: true })
        .setFooter({ text: `Use /help without options to see all categories • ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── Full overview ──
    const fields = Object.entries(categories).map(([cat, cmds]) => {
      const emoji = catEmojis[cat] || '📦';
      const name = cat.charAt(0).toUpperCase() + cat.slice(1);
      const cmdList = cmds.map(c => `\`${c.name}\``).join(' ');
      return {
        name: `${emoji} ${name} (${cmds.length})`,
        value: cmdList,
        inline: false,
      };
    });

    const totalCmds = Object.values(categories).reduce((sum, arr) => sum + arr.length, 0);

    const embed = new EmbedBuilder()
      .setColor(COLORS.admin)
      .setTitle('📖 Void Bot — Command Guide')
      .setDescription(
        `> **${totalCmds} commands** across **${Object.keys(categories).length} categories**\n` +
        '> Use `/help category:fun` to see details for any category\n' +
        '> Use `/features status` to see enabled/disabled features'
      )
      .addFields(fields)
      .setFooter({ text: `Void Bot • ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp()
      .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }));

    // Quick action buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help_moderation').setLabel('Moderation').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
      new ButtonBuilder().setCustomId('help_fun').setLabel('Fun').setStyle(ButtonStyle.Primary).setEmoji('🎮'),
      new ButtonBuilder().setCustomId('help_ai').setLabel('AI').setStyle(ButtonStyle.Primary).setEmoji('🤖'),
      new ButtonBuilder().setCustomId('help_utility').setLabel('Utility').setStyle(ButtonStyle.Primary).setEmoji('🔧'),
      new ButtonBuilder().setCustomId('help_game').setLabel('Games').setStyle(ButtonStyle.Primary).setEmoji('🎯'),
    );

    interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
