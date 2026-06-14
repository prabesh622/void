const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiService = require('../../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('debate')
    .setDescription('AI generates arguments for both sides of a topic')
    .addStringOption(o => o.setName('topic').setDescription('The topic to debate').setRequired(true)),

  async execute(interaction) {
    const topic = interaction.options.getString('topic');

    await interaction.deferReply();

    if (!aiService.gemini) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI is not configured. Set GEMINI_API_KEY.')] });
    }

    try {
      const reply = await aiService.generateDebate(topic);
      if (!reply) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI failed to generate a debate. Try again.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle(`⚖️ Debate: ${topic.slice(0, 100)}`)
        .setDescription(reply.slice(0, 3900))
        .setFooter({ text: `Gemini AI • ${interaction.user.tag}` })
        .setTimestamp();

      interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[CMD] /debate error:', err.message);
      interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('An error occurred. Try again later.')] });
    }
  }
};
