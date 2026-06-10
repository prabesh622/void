const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const Giveaway = require('../../schemas/Giveaway');
const { parseDuration, formatDuration } = require('../../utils/permissions');

function pickWinners(entries, count) {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function endGiveaway(giveaway, channel) {
  giveaway.status = 'ended';
  const entries = giveaway.entries || [];
  const winners = pickWinners(entries, giveaway.winnersCount);
  giveaway.winners = winners;
  await giveaway.save();

  if (!channel) return;

  if (entries.length === 0) {
    const embed = new EmbedBuilder().setColor(0xff4757).setTitle('Giveaway Ended').setDescription(`**Prize:** ${giveaway.prize}\nNo valid entries!`).setTimestamp();
    channel.send({ embeds: [embed] });
    return;
  }

  const winnerList = winners.map(w => `<@${w}>`).join(', ');
  const embed = new EmbedBuilder().setColor(0x00d26a).setTitle('Giveaway Ended!')
    .setDescription(`**Prize:** ${giveaway.prize}\n**Winner(s):** ${winnerList}\n**Total Entries:** ${entries.length}\n**Hosted by:** <@${giveaway.hostId}>`).setTimestamp();

  channel.send({ content: winners.map(w => `<@${w}>`).join(' '), embeds: [embed] });

  try {
    const msg = await channel.messages.fetch(giveaway.messageId);
    msg.edit({ embeds: [new EmbedBuilder().setColor(0x2f3136).setTitle('Giveaway Ended').setDescription(`**Prize:** ${giveaway.prize}\n**Winner(s):** ${winnerList}\n**Total Entries:** ${entries.length}`)], components: [] });
  } catch {}
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .addSubcommand(sub => sub
      .setName('start')
      .setDescription('Start a new giveaway')
      .addStringOption(opt => opt.setName('prize').setDescription('The prize to give away').setRequired(true))
      .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 1h, 30m, 1d)').setRequired(true))
      .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(50).setRequired(false))
      .addRoleOption(opt => opt.setName('required_role').setDescription('Required role to enter').setRequired(false))
    )
    .addSubcommand(sub => sub.setName('end').setDescription('End a giveaway early').addStringOption(opt => opt.setName('id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('reroll').setDescription('Reroll a giveaway').addStringOption(opt => opt.setName('id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List active giveaways'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const durationStr = interaction.options.getString('duration');
      const winnersCount = interaction.options.getInteger('winners') || 1;
      const requiredRole = interaction.options.getRole('required_role');

      const duration = parseDuration(durationStr);
      if (!duration) return interaction.reply({ embeds: [errorEmbed('Error', 'Invalid duration. Use format like `30m`, `1h`, `1d`.')], ephemeral: true });

      const endAt = Date.now() + duration;
      const embed = new EmbedBuilder()
        .setColor(0xffa502)
        .setTitle('GIVEAWAY')
        .setDescription(`**Prize:** ${prize}\n**Winners:** ${winnersCount}\n**Hosted by:** ${interaction.user}\n**Ends:** <t:${Math.floor(endAt / 1000)}:R>`)
        .setFooter({ text: 'Click the button below to enter!' })
        .setTimestamp(endAt);

      if (requiredRole) embed.addFields({ name: 'Required Role', value: `<@&${requiredRole.id}>`, inline: true });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('giveaway_enter').setLabel('Enter Giveaway').setStyle(ButtonStyle.Primary).setEmoji('🎉')
      );

      const msg = await interaction.channel.send({ embeds: [embed], components: [row] });

      await Giveaway.create({
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        messageId: msg.id,
        hostId: interaction.user.id,
        prize,
        winnersCount,
        endAt,
        status: 'running',
        requirements: { roleId: requiredRole?.id || '' },
      });

      interaction.reply({ embeds: [successEmbed('Giveaway Started', `Giveaway for **${prize}** started!\nEnds <t:${Math.floor(endAt / 1000)}:R>`)], ephemeral: true });
    }

    if (sub === 'end') {
      const messageId = interaction.options.getString('id');
      const giveaway = await Giveaway.findOne({ messageId });
      if (!giveaway) return interaction.reply({ embeds: [errorEmbed('Error', 'Giveaway not found.')], ephemeral: true });
      if (giveaway.status !== 'running') return interaction.reply({ embeds: [errorEmbed('Error', 'This giveaway has already ended.')], ephemeral: true });

      const channel = interaction.guild.channels.cache.get(giveaway.channelId);
      await endGiveaway(giveaway, channel);
      interaction.reply({ embeds: [successEmbed('Giveaway Ended', `Giveaway for **${giveaway.prize}** has been ended.`)] });
    }

    if (sub === 'reroll') {
      const messageId = interaction.options.getString('id');
      const giveaway = await Giveaway.findOne({ messageId });
      if (!giveaway) return interaction.reply({ embeds: [errorEmbed('Error', 'Giveaway not found.')], ephemeral: true });
      if (giveaway.status !== 'ended') return interaction.reply({ embeds: [errorEmbed('Error', 'You can only reroll ended giveaways.')], ephemeral: true });

      const entries = giveaway.entries || [];
      if (entries.length === 0) return interaction.reply({ embeds: [errorEmbed('Error', 'No entries to reroll.')], ephemeral: true });

      const winners = pickWinners(entries, giveaway.winnersCount);
      giveaway.winners = winners;
      await giveaway.save();
      const winnerList = winners.map(w => `<@${w}>`).join(', ');

      interaction.reply({ embeds: [infoEmbed('Giveaway Rerolled', `New winner(s) for **${giveaway.prize}**: ${winnerList}`)] });
    }

    if (sub === 'list') {
      const active = await Giveaway.find({ guildId: interaction.guild.id, status: 'running' });
      if (active.length === 0) return interaction.reply({ embeds: [infoEmbed('Giveaways', 'No active giveaways.')] });

      const list = active.map(g => `**${g.prize}** (${g.winnersCount} winner(s), ${g.entries.length} entries) — Ends <t:${Math.floor(g.endAt / 1000)}:R>`).join('\n');
      interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa502).setTitle('Active Giveaways').setDescription(list).setTimestamp()] });
    }
  }
};

module.exports.endGiveaway = endGiveaway;
module.exports.pickWinners = pickWinners;
