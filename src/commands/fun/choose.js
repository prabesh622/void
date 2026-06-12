const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Let the bot pick from your options')
    .addStringOption(o => o.setName('options').setDescription('Options separated by commas (e.g. pizza, sushi, burger)').setRequired(true)),

  async execute(interaction) {
    const optionsStr = interaction.options.getString('options');
    const options = optionsStr.split(',').map(o => o.trim()).filter(o => o.length > 0);

    if (options.length < 2) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('Please provide at least 2 options separated by commas.')], ephemeral: true });
    }

    if (options.length > 20) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('Maximum 20 options allowed.')], ephemeral: true });
    }

    // Dramatic delay
    const thinkingEmojis = ['🤔', '💭', '🧐', '🎲'];
    let chosen = null;
    let currentMsg = null;

    for (let i = 0; i < 3; i++) {
      const random = options[Math.floor(Math.random() * options.length)];
      const emoji = thinkingEmojis[i % thinkingEmojis.length];
      const embed = new EmbedBuilder()
        .setColor(0xffa502)
        .setTitle('🎲 Choosing...')
        .setDescription(`${emoji} Hmm... maybe **${random}**?`)
        .setFooter({ text: `${interaction.user.tag} is asking` });

      if (i === 0) {
        await interaction.reply({ embeds: [embed] });
        currentMsg = await interaction.fetchReply();
      } else {
        await currentMsg.edit({ embeds: [embed] }).catch(() => {});
      }
      await new Promise(r => setTimeout(r, 800));
    }

    chosen = options[Math.floor(Math.random() * options.length)];

    const finalEmbed = new EmbedBuilder()
      .setColor(0x00d26a)
      .setTitle('🎲 I Choose...')
      .setDescription(`# ✨ **${chosen}** ✨\n\n*Options: ${options.map(o => `\`${o}\``).join(', ')}*`)
      .setFooter({ text: `Chosen for ${interaction.user.tag}` })
      .setTimestamp();

    currentMsg.edit({ embeds: [finalEmbed] }).catch(() => {});
  }
};
