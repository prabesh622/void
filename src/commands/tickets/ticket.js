const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');
const Ticket = require('../../schemas/Ticket');
const { generateId } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system management')
    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Set up the ticket panel in this channel')
      .addRoleOption(opt => opt.setName('staff_role').setDescription('The staff role that can manage tickets').setRequired(true))
      .addChannelOption(opt => opt.setName('category').setDescription('Category for ticket channels').addChannelTypes(ChannelType.GuildCategory).setRequired(false))
      .addChannelOption(opt => opt.setName('transcript_channel').setDescription('Channel to send transcripts').addChannelTypes(ChannelType.GuildText).setRequired(false))
      .addStringOption(opt => opt.setName('title').setDescription('Panel title').setRequired(false))
      .addStringOption(opt => opt.setName('description').setDescription('Panel description').setRequired(false))
      .addBooleanOption(opt => opt.setName('categories').setDescription('Enable category selection').setRequired(false))
    )
    .addSubcommand(sub => sub.setName('close').setDescription('Close the current ticket'))
    .addSubcommand(sub => sub.setName('delete').setDescription('Delete the current ticket channel'))
    .addSubcommand(sub => sub.setName('reopen').setDescription('Reopen a closed ticket'))
    .addSubcommand(sub => sub.setName('transcript').setDescription('Generate a transcript of the current ticket'))
    .addSubcommand(sub => sub.setName('stats').setDescription('View ticket statistics'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'setup') {
      const staffRole = interaction.options.getRole('staff_role');
      const category = interaction.options.getChannel('category');
      const transcriptChannel = interaction.options.getChannel('transcript_channel');
      const title = interaction.options.getString('title') || 'Support Tickets';
      const description = interaction.options.getString('description') || 'Click the button below to create a support ticket.\n\nOur team will be with you shortly!';
      const useCategories = interaction.options.getBoolean('categories') || false;

      const panelId = generateId(6);
      const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: interaction.guild.name })
        .setTimestamp();

      const components = [];

      if (useCategories) {
        // Category select menu
        const categories = [
          { label: 'General Support', value: 'general', emoji: '💬' },
          { label: 'Technical Support', value: 'technical', emoji: '🔧' },
          { label: 'Billing', value: 'billing', emoji: '💳' },
          { label: 'Report', value: 'report', emoji: '🚨' },
          { label: 'Other', value: 'other', emoji: '📋' },
        ];
        const select = new StringSelectMenuBuilder()
          .setCustomId('ticket_category')
          .setPlaceholder('Select a category...')
          .addOptions(categories);
        components.push(new ActionRowBuilder().addComponents(select));
      } else {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_create').setLabel('Create Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫')
        );
        components.push(row);
      }

      const msg = await interaction.channel.send({ embeds: [embed], components });

      // Save panel to settings
      await GuildSettings.findOneAndUpdate(
        { guildId },
        {
          'tickets.enabled': true,
          'tickets.staffRoleId': staffRole.id,
          'tickets.categoryId': category?.id || '',
          'tickets.transcriptChannelId': transcriptChannel?.id || '',
          $push: {
            'tickets.panels': {
              panelId,
              channelId: interaction.channel.id,
              messageId: msg.id,
              title,
              description,
              categorySelect: useCategories,
            }
          }
        },
        { upsert: true }
      );

      interaction.reply({ embeds: [successEmbed('Ticket System', `Ticket panel created! Staff role: <@&${staffRole.id}>`)], ephemeral: true });
    }

    if (sub === 'close') {
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Error', 'This is not a ticket channel.')], ephemeral: true });
      if (ticket.status === 'closed') return interaction.reply({ embeds: [errorEmbed('Error', 'This ticket is already closed.')], ephemeral: true });

      ticket.status = 'closed';
      ticket.closedAt = Date.now();
      await ticket.save();

      await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false, AddReactions: false });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
        new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setStyle(ButtonStyle.Secondary).setEmoji('🔓'),
        new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
      );

      interaction.reply({ embeds: [infoEmbed('Ticket Closed', 'This ticket has been closed.')], components: [row] });
    }

    if (sub === 'delete') {
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Error', 'This is not a ticket channel.')], ephemeral: true });

      await Ticket.deleteOne({ channelId: interaction.channel.id });
      await interaction.reply({ embeds: [infoEmbed('Deleting', 'Deleting ticket channel in 5 seconds...')] });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }

    if (sub === 'reopen') {
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Error', 'This is not a ticket channel.')], ephemeral: true });
      if (ticket.status === 'open') return interaction.reply({ embeds: [errorEmbed('Error', 'This ticket is already open.')], ephemeral: true });

      ticket.status = 'reopened';
      await ticket.save();
      await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: true, AddReactions: true });

      interaction.reply({ embeds: [infoEmbed('Reopened', 'Ticket has been reopened.')] });
    }

    if (sub === 'transcript') {
      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return interaction.reply({ embeds: [errorEmbed('Error', 'This is not a ticket channel.')], ephemeral: true });

      await interaction.deferReply();

      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const sorted = [...messages.values()].reverse();
      const transcript = sorted.map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`).join('\n');

      ticket.transcript = transcript;
      await ticket.save();

      const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle('Ticket Transcript')
        .setDescription(`**Ticket:** #${ticket.ticketId}\n**User:** <@${ticket.userId}>\n**Category:** ${ticket.category}\n**Messages:** ${sorted.length}\n\n\`\`\`\n${transcript.slice(0, 3800)}\n\`\`\``)
        .setTimestamp();

      const settings = await GuildSettings.findOne({ guildId });
      if (settings?.tickets?.transcriptChannelId) {
        const ch = interaction.guild.channels.cache.get(settings.tickets.transcriptChannelId);
        if (ch) await ch.send({ embeds: [embed] });
      }

      try { await interaction.user.send({ embeds: [embed] }); } catch {}
      interaction.editReply({ embeds: [successEmbed('Transcript', 'Transcript generated and sent.')] });
    }

    if (sub === 'stats') {
      const total = await Ticket.countDocuments({ guildId });
      const open = await Ticket.countDocuments({ guildId, status: { $in: ['open', 'reopened'] } });
      const closed = await Ticket.countDocuments({ guildId, status: 'closed' });

      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('Ticket Statistics')
          .addFields(
            { name: 'Total Tickets', value: `${total}`, inline: true },
            { name: 'Open', value: `${open}`, inline: true },
            { name: 'Closed', value: `${closed}`, inline: true },
          )
          .setTimestamp()
        ]
      });
    }
  }
};
