const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embeds');
const aiService = require('../../services/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('build')
    .setDescription('Get a recommended build/loadout for any game')
    .addStringOption(o => o.setName('game').setDescription('Game name (e.g., Diablo 4, Elden Ring, Destiny 2)').setRequired(true))
    .addStringOption(o => o.setName('class').setDescription('Class/character (optional, e.g., Necromancer, Mage)').setRequired(false))
    .addStringOption(o => o.setName('playstyle').setDescription('Playstyle preference').setRequired(false)
      .addChoices(
        { name: 'DPS / Damage', value: 'dps' },
        { name: 'Tank', value: 'tank' },
        { name: 'Support / Healer', value: 'support' },
        { name: 'PvP', value: 'pvp' },
        { name: 'Solo / Casual', value: 'solo' },
        { name: 'Endgame / Hardcore', value: 'endgame' },
      )),

  async execute(interaction) {
    await interaction.deferReply();
    const game = interaction.options.getString('game');
    const charClass = interaction.options.getString('class') || 'any class';
    const playstyle = interaction.options.getString('playstyle') || 'balanced';

    const aiReply = await aiService.getGeminiResponse(
      `Give me the best current meta build for ${game} playing as ${charClass} with a ${playstyle} playstyle.
Include:
- **Build Name**
- **Key Skills/Abilities** (top 5-6)
- **Best Gear/Items** (top 3-4)
- **Stat Priorities** (what to focus on)
- **Playstyle Tips** (2-3 quick tips)
- **Weaknesses** (what to watch out for)
Format with bold headers and bullet points. Be specific with item/skill names.`,
      `You are VoIdDyNaStY, a gaming expert with deep knowledge of game builds, metas, and strategies. Provide accurate, current meta builds. Use gaming emojis. Be specific with names and numbers.`
    );

    const embed = new EmbedBuilder()
      .setColor(COLORS.game)
      .setTitle(`⚔️ ${game} — ${charClass} Build (${playstyle})`)
      .setDescription(aiReply || 'Could not generate a build. Try being more specific with the game and class.')
      .setFooter({ text: `Build for ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  },
};
