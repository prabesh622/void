const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiService = require('../../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Ask the AI anything (gaming knowledge, general, code, etc.)')
    .addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true))
    .addStringOption(o => o.setName('personality').setDescription('AI personality').setRequired(false)
      .addChoices(
        { name: 'Gamer (default)', value: 'gamer' },
        { name: 'Friendly', value: 'friendly' },
        { name: 'Funny', value: 'funny' },
        { name: 'Anime', value: 'anime' },
        { name: 'Professional', value: 'professional' },
      )),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const personality = interaction.options.getString('personality') || 'gamer';

    await interaction.deferReply();

    if (!aiService.gemini) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI is not configured. Please set your GEMINI_API_KEY in the environment.')] });
    }

    const systemPrompt = aiService.personalities[personality] || aiService.personalities.gamer;

    try {
      const reply = await aiService.getGeminiResponse(question, `${systemPrompt}\nUser: ${interaction.user.username}. Keep responses concise and engaging.`);

      if (!reply) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI failed to generate a response. Please try again in a moment. (Rate limited)')] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x4285f4)
        .setTitle('🎮 AI Response')
        .setDescription(`**Q:** ${question.slice(0, 500)}\n\n**A:** ${reply.slice(0, 3800)}`)
        .setFooter({ text: `Gemini • ${personality} personality • ${interaction.user.tag}` })
        .setTimestamp();

      interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[AI] /ai error:', err.message);
      interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('An error occurred. Please try again later.')] });
    }
  }
};
