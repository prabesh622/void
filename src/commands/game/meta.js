const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embeds');
const aiService = require('../../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meta')
    .setDescription('Get the current meta/tier list for a game')
    .addStringOption(o => o.setName('game').setDescription('Game name (e.g., League of Legends, Valorant, Overwatch 2)').setRequired(true))
    .addStringOption(o => o.setName('role').setDescription('Specific role/position (optional)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();
    const game = interaction.options.getString('game');
    const role = interaction.options.getString('role') || 'all roles';

    // Try to get live search data
    const searchResults = await aiService.googleSearch(`${game} current meta tier list ${role} ${new Date().getFullYear()}`);
    let searchContext = '';
    if (searchResults && searchResults.length > 0) {
      searchContext = '\n\nLive search data:\n' + searchResults.slice(0, 3).map(r => `- ${r.title}: ${r.snippet}`).join('\n');
    }

    const aiReply = await aiService.getGeminiResponse(
      `What is the current meta/tier list for ${game} for ${role}?${searchContext}
Provide:
- **S-Tier** (top picks)
- **A-Tier** (strong picks)
- **B-Tier** (viable picks)
- **Current Meta Summary** (1-2 sentences)
- **Why** (brief explanation for top picks)
Format with bold headers and bullet points. Be specific with character/champion names.`,
      `You are VoIdDyNaStY, a competitive gaming expert. Provide accurate current meta analysis. Use gaming emojis. Be specific with names.`
    );

    const embed = new EmbedBuilder()
      .setColor(COLORS.game)
      .setTitle(`🏆 ${game} — Meta Tier List (${role})`)
      .setDescription(aiReply || 'Could not fetch meta info. Try checking dedicated tier list sites.')
      .setFooter({ text: `Meta for ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    if (searchResults && searchResults.length > 0) {
      embed.addFields({
        name: '🔗 Sources',
        value: searchResults.slice(0, 3).map(r => `[${r.title.slice(0, 40)}](${r.link})`).join(' • '),
        inline: false,
      });
    }

    interaction.editReply({ embeds: [embed] });
  },
};
