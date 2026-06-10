const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tickettriage')
    .setDescription('Manage AI ticket triage (qualifies tickets from ANY ticket bot)')
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable AI ticket triage'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable AI ticket triage'))
    .addSubcommand(sub => sub.setName('status').setDescription('View current triage settings'))
    .addSubcommand(sub => sub
      .setName('category')
      .setDescription('Set the ticket category to monitor')
      .addChannelOption(opt => opt.setName('category').setDescription('Ticket category (channels created here will be triaged)').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('pattern')
      .setDescription('Set channel name patterns to detect as tickets')
      .addStringOption(opt => opt.setName('patterns').setDescription('Comma-separated patterns (e.g. ticket-,support-,help-)').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('question')
      .setDescription('Add or remove custom qualification questions')
      .addStringOption(opt => opt.setName('action').setDescription('Add or remove').setRequired(true)
        .addChoices({ name: 'Add', value: 'add' }, { name: 'Clear All', value: 'clear' }))
      .addStringOption(opt => opt.setName('question').setDescription('The question text (required for add)').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('threshold')
      .setDescription('Set the AI qualification score threshold (0-100)')
      .addIntegerOption(opt => opt.setName('score').setDescription('Minimum score to pass (default 40)').setMinValue(0).setMaxValue(100).setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('logchannel')
      .setDescription('Set the channel to log triage results')
      .addChannelOption(opt => opt.setName('channel').setDescription('Log channel for triage results').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('staffrole')
      .setDescription('Set the staff role to ping for unqualified tickets')
      .addRoleOption(opt => opt.setName('role').setDescription('Staff role').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let settings = await GuildSettings.findOne({ guildId });
    if (!settings) settings = await GuildSettings.create({ guildId });

    if (sub === 'enable') {
      await GuildSettings.updateOne({ guildId }, { 'ticketAI.enabled': true });
      interaction.reply({
        embeds: [successEmbed('AI Ticket Triage', 'AI ticket triage has been **enabled**.\n\nIt will automatically detect new ticket channels and ask qualifying questions to determine if the ticket is legitimate.\n\n**Works with ANY ticket bot!** Just set the category or patterns to match your ticket channels.')]
      });
    }

    if (sub === 'disable') {
      await GuildSettings.updateOne({ guildId }, { 'ticketAI.enabled': false });
      interaction.reply({ embeds: [successEmbed('AI Ticket Triage', 'AI ticket triage has been **disabled**.')] });
    }

    if (sub === 'status') {
      const t = settings.ticketAI || {};
      const questions = t.questions?.length ? t.questions.map((q, i) => `${i + 1}. ${q}`).join('\n') : '*Using default questions*';
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x6c5ce7)
          .setTitle('🤖 AI Ticket Triage Settings')
          .addFields(
            { name: 'Status', value: t.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Category', value: t.categoryId ? `<#${t.categoryId}>` : 'Not set', inline: true },
            { name: 'Patterns', value: t.channelPatterns?.join(', ') || 'ticket-', inline: true },
            { name: 'Max Questions', value: `${t.maxQuestions || 3}`, inline: true },
            { name: 'Staff Role', value: t.staffRoleId ? `<@&${t.staffRoleId}>` : 'Not set', inline: true },
            { name: 'Log Channel', value: t.logChannelId ? `<#${t.logChannelId}>` : 'Not set', inline: true },
            { name: 'Custom Questions', value: questions.slice(0, 1000), inline: false },
          )
          .setTimestamp()
        ]
      });
    }

    if (sub === 'category') {
      const category = interaction.options.getChannel('category');
      await GuildSettings.updateOne({ guildId }, { 'ticketAI.categoryId': category.id });
      interaction.reply({ embeds: [successEmbed('AI Ticket Triage', `Ticket category set to <#${category.id}>.\nAll new channels in this category will be triaged.`)] });
    }

    if (sub === 'pattern') {
      const patterns = interaction.options.getString('patterns').split(',').map(p => p.trim()).filter(Boolean);
      await GuildSettings.updateOne({ guildId }, { 'ticketAI.channelPatterns': patterns });
      interaction.reply({ embeds: [successEmbed('AI Ticket Triage', `Channel patterns set to: \`${patterns.join('`, `')}\`\nChannels matching these patterns will be triaged.`)] });
    }

    if (sub === 'question') {
      const action = interaction.options.getString('action');
      if (action === 'clear') {
        await GuildSettings.updateOne({ guildId }, { 'ticketAI.questions': [] });
        interaction.reply({ embeds: [successEmbed('AI Ticket Triage', 'Custom questions cleared. Will use default questions.')] });
      } else {
        const question = interaction.options.getString('question');
        if (!question) return interaction.reply({ embeds: [errorEmbed('Error', 'Please provide a question text.')], ephemeral: true });

        const currentQuestions = settings.ticketAI?.questions || [];
        if (currentQuestions.length >= 5) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'Maximum 5 custom questions. Clear some first.')] });
        }

        await GuildSettings.updateOne({ guildId }, { $push: { 'ticketAI.questions': question } });
        interaction.reply({ embeds: [successEmbed('AI Ticket Triage', `Question added! (${currentQuestions.length + 1}/5)\n**${currentQuestions.length + 1}.** ${question}`)] });
      }
    }

    if (sub === 'threshold') {
      const score = interaction.options.getInteger('score');
      await GuildSettings.updateOne({ guildId }, { 'ticketAI.qualificationThreshold': score });
      interaction.reply({ embeds: [successEmbed('AI Ticket Triage', `Qualification threshold set to **${score}**/100.`)] });
    }

    if (sub === 'logchannel') {
      const channel = interaction.options.getChannel('channel');
      await GuildSettings.updateOne({ guildId }, { 'ticketAI.logChannelId': channel.id });
      interaction.reply({ embeds: [successEmbed('AI Ticket Triage', `Triage results will be logged to <#${channel.id}>.`)] });
    }

    if (sub === 'staffrole') {
      const role = interaction.options.getRole('role');
      await GuildSettings.updateOne({ guildId }, { 'ticketAI.staffRoleId': role.id });
      interaction.reply({ embeds: [successEmbed('AI Ticket Triage', `Staff role set to <@&${role.id}>. They'll be pinged for unqualified tickets.`)] });
    }
  }
};
