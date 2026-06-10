const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Configure verification system')
    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Set up verification in a channel')
      .addChannelOption(opt => opt.setName('channel').setDescription('Verification channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addRoleOption(opt => opt.setName('role').setDescription('Verified role').setRequired(true))
      .addStringOption(opt => opt.setName('type').setDescription('Verification type').setRequired(true)
        .addChoices({ name: 'Button', value: 'button' }, { name: 'Captcha', value: 'captcha' }, { name: 'Both', value: 'both' }))
    )
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable verification'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable verification'))
    .addSubcommand(sub => sub
      .setName('anti-alt')
      .setDescription('Configure anti-alt account protection')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
      .addIntegerOption(opt => opt.setName('days').setDescription('Minimum account age in days').setMinValue(0).setMaxValue(365).setRequired(false))
    )
    .addSubcommand(sub => sub.setName('status').setDescription('View verification status'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let settings = await GuildSettings.findOne({ guildId });
    if (!settings) settings = await GuildSettings.create({ guildId });

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const role = interaction.options.getRole('role');
      const type = interaction.options.getString('type');

      const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle('Verification')
        .setDescription(type === 'captcha' ? 'Solve the math captcha in your DMs to get verified.' : 'Click the button below to verify yourself.')
        .setFooter({ text: interaction.guild.name })
        .setTimestamp();

      const components = [];
      if (type !== 'captcha') {
        components.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('verify_button').setLabel('Verify').setStyle(ButtonStyle.Success).setEmoji('✅')
        ));
      }

      const msg = await channel.send({ embeds: [embed], components });

      await GuildSettings.updateOne({ guildId }, {
        'verification.enabled': true,
        'verification.channelId': channel.id,
        'verification.messageId': msg.id,
        'verification.verifiedRole': role.id,
        'verification.type': type,
      });

      interaction.reply({ embeds: [successEmbed('Verification', `Verification set up in <#${channel.id}> with role <@&${role.id}>.`)], ephemeral: true });
    }

    if (sub === 'enable') {
      await GuildSettings.updateOne({ guildId }, { 'verification.enabled': true });
      interaction.reply({ embeds: [successEmbed('Verification', 'Verification **enabled**.')] });
    }

    if (sub === 'disable') {
      await GuildSettings.updateOne({ guildId }, { 'verification.enabled': false });
      interaction.reply({ embeds: [successEmbed('Verification', 'Verification **disabled**.')] });
    }

    if (sub === 'anti-alt') {
      const enabled = interaction.options.getBoolean('enabled');
      const days = interaction.options.getInteger('days') || 7;
      await GuildSettings.updateOne({ guildId }, { 'verification.antiAlt': enabled, 'verification.minAccountAge': days });
      interaction.reply({ embeds: [successEmbed('Anti-Alt', `Anti-alt **${enabled ? 'enabled' : 'disabled'}** (min age: ${days} days).`)] });
    }

    if (sub === 'status') {
      const v = settings.verification;
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('Verification Status')
          .addFields(
            { name: 'Status', value: v.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Type', value: v.type || 'button', inline: true },
            { name: 'Channel', value: v.channelId ? `<#${v.channelId}>` : 'Not set', inline: true },
            { name: 'Verified Role', value: v.verifiedRole ? `<@&${v.verifiedRole}>` : 'Not set', inline: true },
            { name: 'Anti-Alt', value: v.antiAlt ? `✅ (${v.minAccountAge || 0} days)` : '❌', inline: true },
          )
          .setTimestamp()
        ]
      });
    }
  }
};
