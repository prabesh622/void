const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiService = require('../../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('story')
    .setDescription('AI generates a short story from your prompt')
    .addStringOption(o => o.setName('prompt').setDescription('Story idea or prompt').setRequired(true))
    .addStringOption(o => o.setName('genre').setDescription('Story genre').setRequired(false)
      .addChoices(
        { name: 'Adventure', value: 'adventure' },
        { name: 'Horror', value: 'horror' },
        { name: 'Sci-Fi', value: 'sci-fi' },
        { name: 'Fantasy', value: 'fantasy' },
        { name: 'Romance', value: 'romance' },
        { name: 'Comedy', value: 'comedy' },
        { name: 'Mystery', value: 'mystery' },
        { name: 'Gaming', value: 'gaming' },
      )),

  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    const genre = interaction.options.getString('genre') || 'adventure';

    await interaction.deferReply();

    if (!aiService.gemini) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI is not configured. Set GEMINI_API_KEY.')] });
    }

    try {
      const reply = await aiService.generateStory(prompt, genre);
      if (!reply) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI failed to generate a story. Try again.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`📖 ${genre.charAt(0).toUpperCase() + genre.slice(1)} Story`)
        .setDescription(`*Prompt: ${prompt.slice(0, 100)}*\n\n${reply.slice(0, 3900)}`)
        .setFooter({ text: `Gemini AI • ${interaction.user.tag}` })
        .setTimestamp();

      interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[CMD] /story error:', err.message);
      interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('An error occurred. Try again later.')] });
    }
  }
};
