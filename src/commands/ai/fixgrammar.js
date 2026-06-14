const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiService = require('../../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fixgrammar')
    .setDescription('AI fixes grammar and spelling in your text')
    .addStringOption(o => o.setName('text').setDescription('Text to fix').setRequired(true)),

  async execute(interaction) {
    const text = interaction.options.getString('text');

    await interaction.deferReply();

    if (!aiService.gemini) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI is not configured. Set GEMINI_API_KEY.')] });
    }

    try {
      const reply = await aiService.fixGrammar(text);
      if (!reply) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI failed to fix grammar. Try again.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✏️ Grammar Fix')
        .addFields(
          { name: 'Original', value: text.slice(0, 1000) },
          { name: 'Corrected', value: reply.slice(0, 1000) },
        )
        .setFooter({ text: `Gemini AI • ${interaction.user.tag}` })
        .setTimestamp();

      interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[CMD] /fixgrammar error:', err.message);
      interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('An error occurred. Try again later.')] });
    }
  }
};
