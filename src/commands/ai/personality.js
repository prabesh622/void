const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');

const PERSONALITIES = {
  friendly: 'A friendly and helpful assistant.',
  funny: 'A humorous and witty companion who loves jokes.',
  gamer: 'A gaming enthusiast who speaks in gaming terms.',
  anime: 'An anime-loving character who uses anime references.',
  professional: 'A formal and professional assistant.',
  moderator: 'A strict but fair moderator who helps enforce rules.',
  custom: 'Custom personality (set with /ai custom).',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('personality')
    .setDescription('Set the AI personality')
    .addStringOption(opt => opt.setName('type').setDescription('Personality type').setRequired(true)
      .addChoices(
        { name: 'Friendly', value: 'friendly' },
        { name: 'Funny', value: 'funny' },
        { name: 'Gamer', value: 'gamer' },
        { name: 'Anime', value: 'anime' },
        { name: 'Professional', value: 'professional' },
        { name: 'Moderator', value: 'moderator' },
      )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    const guildId = interaction.guild.id;

    await GuildSettings.updateOne({ guildId }, { 'ai.personality': type });
    interaction.reply({ embeds: [successEmbed('AI Personality', `Personality set to **${type}**: ${PERSONALITIES[type]}`)] });
  }
};
