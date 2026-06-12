const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embeds');
const aiService = require('../../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search the web with AI-powered answers')
    .addStringOption(o => o.setName('query').setDescription('What to search for').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString('query');

    const reply = await aiService.searchAndAnswer(query);

    const embed = new EmbedBuilder()
      .setColor(COLORS.ai)
      .setTitle(`🔍 Search: ${query.slice(0, 100)}`)
      .setDescription(reply || 'Could not find relevant results. Try rephrasing your query.')
      .setFooter({ text: `Searched by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  },
};
