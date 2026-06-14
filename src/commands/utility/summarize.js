const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiService = require('../../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('summarize')
    .setDescription('Summarize text using AI')
    .addStringOption(o => o.setName('text').setDescription('Text to summarize').setRequired(true))
    .addStringOption(o => o.setName('style').setDescription('Summary style').setRequired(false)
      .addChoices(
        { name: 'Brief (2-3 sentences)', value: 'brief' },
        { name: 'Detailed (paragraph)', value: 'detailed' },
        { name: 'Bullet Points', value: 'bullets' },
      )),

  async execute(interaction) {
    const text = interaction.options.getString('text');
    const style = interaction.options.getString('style') || 'brief';

    if (!aiService.gemini) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI is not configured. Please set GEMINI_API_KEY.')], ephemeral: true });
    }

    await interaction.deferReply();

    const result = await aiService.summarizeText(text, style);

    if (!result) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('Summarization failed. Please try again later.')] });
    }

    const styleLabels = { brief: '📝 Brief', detailed: '📄 Detailed', bullets: '📋 Bullet Points' };

    const embed = new EmbedBuilder()
      .setColor(0xffa502)
      .setTitle('📋 Summary')
      .setDescription(`**Original:** ${text.slice(0, 500)}${text.length > 500 ? '...' : ''}\n\n**${styleLabels[style] || styleLabels.brief}:**\n${result.slice(0, 3500)}`)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  }
};
