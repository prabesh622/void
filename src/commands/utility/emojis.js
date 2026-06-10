const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emojis')
    .setDescription('Auto-detect and display all emojis in this server')
    .addStringOption(opt => opt.setName('filter').setDescription('Filter emojis')
      .addChoices(
        { name: 'All', value: 'all' },
        { name: 'Static Only', value: 'static' },
        { name: 'Animated Only', value: 'animated' },
      ).setRequired(false))
    .addStringOption(opt => opt.setName('search').setDescription('Search by emoji name').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

  async execute(interaction) {
    await interaction.deferReply();

    const filter = interaction.options.getString('filter') || 'all';
    const search = interaction.options.getString('search')?.toLowerCase();
    const guild = interaction.guild;

    let emojis = guild.emojis.cache;

    // Apply search filter
    if (search) {
      emojis = emojis.filter(e => e.name.toLowerCase().includes(search));
    }

    // Apply type filter
    if (filter === 'static') {
      emojis = emojis.filter(e => !e.animated);
    } else if (filter === 'animated') {
      emojis = emojis.filter(e => e.animated);
    }

    if (emojis.size === 0) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setTitle('😀 Emojis').setDescription('No emojis found matching your criteria.').setTimestamp()] });
    }

    const staticEmojis = emojis.filter(e => !e.animated);
    const animatedEmojis = emojis.filter(e => e.animated);

    const fields = [];

    if (staticEmojis.size > 0 && filter !== 'animated') {
      // Split into chunks of 30 per field
      const chunks = [...staticEmojis.values()];
      const chunkSize = 30;
      for (let i = 0; i < Math.min(chunks.length, chunkSize * 5); i += chunkSize) {
        const chunk = chunks.slice(i, i + chunkSize);
        fields.push({
          name: i === 0 ? `📦 Static Emojis (${staticEmojis.size})` : '\u200b',
          value: chunk.map(e => `<:${e.name}:${e.id}>`).join(' '),
          inline: false,
        });
      }
    }

    if (animatedEmojis.size > 0 && filter !== 'static') {
      const chunks = [...animatedEmojis.values()];
      const chunkSize = 30;
      for (let i = 0; i < Math.min(chunks.length, chunkSize * 5); i += chunkSize) {
        const chunk = chunks.slice(i, i + chunkSize);
        fields.push({
          name: i === 0 ? `✨ Animated Emojis (${animatedEmojis.size})` : '\u200b',
          value: chunk.map(e => `<a:${e.name}:${e.id}>`).join(' '),
          inline: false,
        });
      }
    }

    // Emoji details
    const emojiDetails = [];
    const topEmojis = emojis.first(10);
    for (const emoji of topEmojis) {
      emojiDetails.push(`\`${emoji.animated ? '<a:' : '<:'}${emoji.name}:${emoji.id}>\` — **${emoji.name}** (${emoji.animated ? 'Animated' : 'Static'}) — ID: \`${emoji.id}\``);
    }

    fields.push({
      name: '📋 Emoji Details (Top 10)',
      value: emojiDetails.join('\n') || 'None',
      inline: false,
    });

    // Stats
    const totalSlots = guild.premiumTier === 0 ? 50 : guild.premiumTier === 1 ? 100 : guild.premiumTier === 2 ? 150 : 250;
    fields.push({
      name: '📊 Emoji Stats',
      value: `Static: **${guild.emojis.cache.filter(e => !e.animated).size}/${totalSlots}**\nAnimated: **${guild.emojis.cache.filter(e => e.animated).size}/${totalSlots}**\nTotal: **${guild.emojis.cache.size}/${totalSlots * 2}**`,
      inline: true,
    });

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(`😀 ${guild.name} — Emojis`)
      .setDescription(`Found **${emojis.size}** emoji(s)${search ? ` matching "${search}"` : ''}`)
      .addFields(fields.slice(0, 25))
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  },
};
