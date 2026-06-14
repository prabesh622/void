const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiService = require('../../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('explain')
    .setDescription('AI explains code in simple terms')
    .addStringOption(o => o.setName('code').setDescription('The code to explain').setRequired(true))
    .addStringOption(o => o.setName('language').setDescription('Programming language').setRequired(false)
      .addChoices(
        { name: 'JavaScript', value: 'javascript' },
        { name: 'Python', value: 'python' },
        { name: 'Java', value: 'java' },
        { name: 'C++', value: 'cpp' },
        { name: 'C#', value: 'csharp' },
        { name: 'Go', value: 'go' },
        { name: 'Rust', value: 'rust' },
        { name: 'HTML/CSS', value: 'html' },
        { name: 'SQL', value: 'sql' },
        { name: 'Other', value: 'other' },
      )),

  async execute(interaction) {
    const code = interaction.options.getString('code');
    const language = interaction.options.getString('language') || '';
    const lang = language === 'other' ? '' : language;

    await interaction.deferReply();

    if (!aiService.gemini) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI is not configured. Set GEMINI_API_KEY.')] });
    }

    try {
      const reply = await aiService.explainCode(code, lang);
      if (!reply) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI failed to generate a response. Try again.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle('💻 Code Explanation')
        .setDescription(reply.slice(0, 3900))
        .setFooter({ text: `Gemini AI • ${interaction.user.tag}` })
        .setTimestamp();

      interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[CMD] /explain error:', err.message);
      interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('An error occurred. Try again later.')] });
    }
  }
};
