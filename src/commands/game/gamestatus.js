const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, panelEmbed } = require('../../utils/embeds');
const aiService = require('../../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamestatus')
    .setDescription('Check if a game\'s servers are online')
    .addStringOption(o => o.setName('game').setDescription('Game name (e.g., Fortnite, Apex Legends, Valorant)').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const game = interaction.options.getString('game');

    // First try Google search for live status
    const searchResults = await aiService.googleSearch(`${game} server status today`);

    let statusText = '';
    if (searchResults && searchResults.length > 0) {
      statusText = searchResults.slice(0, 3).map(r => `• [${r.title}](${r.link})\n  ${r.snippet}`).join('\n\n');
    }

    // Get AI summary
    const aiReply = await aiService.getGeminiResponse(
      `What is the current server status for ${game}? Is it online, down for maintenance, or experiencing issues? ${statusText ? 'Based on search: ' + statusText : ''}\nProvide a brief status summary with bold headers.`,
      `You are VoIdDyNaStY, a gaming expert bot. Provide game server status info concisely. Use gaming emojis. Format with **bold headers**.`
    );

    const embed = new EmbedBuilder()
      .setColor(COLORS.game)
      .setTitle(`🎮 ${game} — Server Status`)
      .setDescription(aiReply || 'Could not fetch server status. Try checking the game\'s official status page.')
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
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
