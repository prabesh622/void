const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Manage AI chat system')
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable AI chat'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable AI chat'))
    .addSubcommand(sub => sub.setName('setup').setDescription('View AI settings'))
    .addSubcommand(sub => sub
      .setName('mode')
      .setDescription('Set AI interaction mode')
      .addStringOption(opt => opt.setName('mode').setDescription('Mode').setRequired(true)
        .addChoices({ name: 'Mention Only', value: 'mention' }, { name: 'Auto Reply', value: 'auto' }))
    )
    .addSubcommand(sub => sub
      .setName('cooldown')
      .setDescription('Set AI response cooldown (seconds)')
      .addIntegerOption(opt => opt.setName('seconds').setDescription('Cooldown in seconds').setMinValue(1).setMaxValue(60).setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('nsfw')
      .setDescription('Toggle NSFW filter')
      .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('custom')
      .setDescription('Set a custom system prompt')
      .addStringOption(opt => opt.setName('prompt').setDescription('Custom system prompt').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let settings = await GuildSettings.findOne({ guildId });
    if (!settings) settings = await GuildSettings.create({ guildId });

    if (sub === 'enable') {
      await GuildSettings.updateOne({ guildId }, { 'ai.enabled': true });
      interaction.reply({ embeds: [successEmbed('AI Chat', 'AI chat has been **enabled**. Add channels with `/aichannel add`.')] });
    }

    if (sub === 'disable') {
      await GuildSettings.updateOne({ guildId }, { 'ai.enabled': false });
      interaction.reply({ embeds: [successEmbed('AI Chat', 'AI chat has been **disabled**.')] });
    }

    if (sub === 'setup') {
      const ai = settings.ai;
      interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('AI Chat Settings')
          .addFields(
            { name: 'Status', value: ai.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Mode', value: ai.mentionMode ? 'Mention Only' : 'Auto Reply', inline: true },
            { name: 'Personality', value: ai.personality || 'friendly', inline: true },
            { name: 'Cooldown', value: `${ai.cooldown || 5}s`, inline: true },
            { name: 'NSFW Filter', value: ai.nsfwFilter ? '✅ On' : '❌ Off', inline: true },
            { name: 'Max History', value: `${ai.maxHistory || 10} messages`, inline: true },
            { name: 'Channels', value: ai.channels?.length ? ai.channels.map(c => `<#${c}>`).join(', ') : 'None', inline: false },
            { name: 'Custom Prompt', value: ai.customPrompt ? '✅ Set' : '❌ Not set', inline: false },
          )
          .setTimestamp()
        ]
      });
    }

    if (sub === 'mode') {
      const mode = interaction.options.getString('mode');
      await GuildSettings.updateOne({ guildId }, { 'ai.mentionMode': mode === 'mention', 'ai.autoReply': mode === 'auto' });
      interaction.reply({ embeds: [successEmbed('AI Mode', `AI mode set to **${mode === 'mention' ? 'Mention Only' : 'Auto Reply'}**.`)] });
    }

    if (sub === 'cooldown') {
      const seconds = interaction.options.getInteger('seconds');
      await GuildSettings.updateOne({ guildId }, { 'ai.cooldown': seconds });
      interaction.reply({ embeds: [successEmbed('AI Cooldown', `AI cooldown set to **${seconds}s**.`)] });
    }

    if (sub === 'nsfw') {
      const enabled = interaction.options.getBoolean('enabled');
      await GuildSettings.updateOne({ guildId }, { 'ai.nsfwFilter': enabled });
      interaction.reply({ embeds: [successEmbed('AI NSFW Filter', `NSFW filter **${enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'custom') {
      const prompt = interaction.options.getString('prompt');
      await GuildSettings.updateOne({ guildId }, { 'ai.customPrompt': prompt, 'ai.personality': 'custom' });
      interaction.reply({ embeds: [successEmbed('AI Custom Prompt', 'Custom system prompt has been set.')] });
    }
  }
};
