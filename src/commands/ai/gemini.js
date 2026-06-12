const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiService = require('../../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gemini')
    .setDescription('Ask Google Gemini AI anything')
    .addStringOption(o => o.setName('prompt').setDescription('Your question or prompt').setRequired(true))
    .addStringOption(o => o.setName('style').setDescription('Response style').setRequired(false)
      .addChoices(
        { name: 'Normal', value: 'normal' },
        { name: 'Creative', value: 'creative' },
        { name: 'Code', value: 'code' },
        { name: 'Simple', value: 'simple' },
        { name: 'Gamer', value: 'gamer' },
      )),

  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    const style = interaction.options.getString('style') || 'normal';

    await interaction.deferReply();

    if (!aiService.gemini) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('Gemini API is not configured. Please set your GEMINI_API_KEY.')] });
    }

    const stylePrompts = {
      normal: 'Be concise and helpful.',
      creative: 'Be creative, imaginative, and use vivid descriptions.',
      code: 'Respond with code examples when relevant. Use proper code formatting with code blocks.',
      simple: 'Explain in very simple terms that anyone can understand.',
      gamer: aiService.GAMING_PERSONALITY,
    };

    try {
      const reply = await aiService.getGeminiResponse(prompt, stylePrompts[style] || stylePrompts.normal);

      if (!reply) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('Gemini failed to generate a response. Please try again in a moment. (Rate limited)')] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x4285f4)
        .setTitle('✨ Gemini AI')
        .setDescription(`${reply.slice(0, 3900)}`)
        .setFooter({ text: `Google Gemini • ${style} style • ${interaction.user.tag}` })
        .setTimestamp();

      interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Gemini] Error:', err.message);
      interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('An error occurred. Please try again later.')] });
    }
  }
};
