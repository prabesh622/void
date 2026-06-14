const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiService = require('../../services/aiService');

const LANGUAGES = [
  { name: 'Spanish', value: 'Spanish' },
  { name: 'French', value: 'French' },
  { name: 'German', value: 'German' },
  { name: 'Japanese', value: 'Japanese' },
  { name: 'Korean', value: 'Korean' },
  { name: 'Chinese', value: 'Chinese' },
  { name: 'Hindi', value: 'Hindi' },
  { name: 'Arabic', value: 'Arabic' },
  { name: 'Portuguese', value: 'Portuguese' },
  { name: 'Russian', value: 'Russian' },
  { name: 'Italian', value: 'Italian' },
  { name: 'Nepali', value: 'Nepali' },
  { name: 'English', value: 'English' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text to another language using AI')
    .addStringOption(o => o.setName('text').setDescription('Text to translate').setRequired(true))
    .addStringOption(o => o.setName('to').setDescription('Target language').setRequired(true).addChoices(...LANGUAGES))
    .addStringOption(o => o.setName('from').setDescription('Source language (auto-detect if empty)').setRequired(false).addChoices(...LANGUAGES)),

  async execute(interaction) {
    const text = interaction.options.getString('text');
    const toLang = interaction.options.getString('to');
    const fromLang = interaction.options.getString('from');

    if (!aiService.gemini) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('AI is not configured. Please set GEMINI_API_KEY.')], ephemeral: true });
    }

    await interaction.deferReply();

    const fullText = fromLang ? `[From ${fromLang}] ${text}` : text;
    const result = await aiService.translateText(fullText, toLang);

    if (!result) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('Translation failed. Please try again later.')] });
    }

    const embed = new EmbedBuilder()
      .setColor(0x00d26a)
      .setTitle('🌐 Translation')
      .setDescription(`**${fromLang || 'Auto'}:** ${text.slice(0, 1000)}\n\n**${toLang}:** ${result.slice(0, 3000)}`)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  }
};
