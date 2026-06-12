const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('urban')
    .setDescription('Search Urban Dictionary')
    .addStringOption(o => o.setName('word').setDescription('Word or phrase to look up').setRequired(true)),

  async execute(interaction) {
    const word = interaction.options.getString('word');
    await interaction.deferReply();

    try {
      const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(word)}`);
      const data = await res.json();

      if (!data.list || data.list.length === 0) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription(`No results found for **${word}**.`)] });
      }

      // Get the top definition
      const def = data.list[0];
      const definition = def.definition?.replace(/\[|\]/g, '').slice(0, 1000) || 'No definition';
      const example = def.example?.replace(/\[|\]/g, '').slice(0, 500) || 'No example';
      const author = def.author || 'Unknown';

      const embed = new EmbedBuilder()
        .setColor(0x1d2439)
        .setTitle(`📖 ${def.word}`)
        .setURL(def.permalink)
        .setDescription(`**Definition:**\n${definition}\n\n**Example:**\n*${example}*`)
        .addFields(
          { name: '👍 Upvotes', value: `${def.thumbs_up || 0}`, inline: true },
          { name: '👎 Downvotes', value: `${def.thumbs_down || 0}`, inline: true },
          { name: '✍️ Author', value: author, inline: true },
        )
        .setFooter({ text: `${data.list.length} total definitions • Urban Dictionary` })
        .setTimestamp();

      interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Urban] Error:', err.message);
      interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('Failed to fetch from Urban Dictionary. Please try again.')] });
    }
  }
};
