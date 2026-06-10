const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll with up to 10 options')
    .addStringOption(opt => opt.setName('question').setDescription('The poll question').setRequired(true))
    .addStringOption(opt => opt.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(opt => opt.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(opt => opt.setName('option3').setDescription('Option 3').setRequired(false))
    .addStringOption(opt => opt.setName('option4').setDescription('Option 4').setRequired(false))
    .addStringOption(opt => opt.setName('option5').setDescription('Option 5').setRequired(false))
    .addStringOption(opt => opt.setName('option6').setDescription('Option 6').setRequired(false))
    .addStringOption(opt => opt.setName('option7').setDescription('Option 7').setRequired(false))
    .addStringOption(opt => opt.setName('option8').setDescription('Option 8').setRequired(false))
    .addStringOption(opt => opt.setName('option9').setDescription('Option 9').setRequired(false))
    .addStringOption(opt => opt.setName('option10').setDescription('Option 10').setRequired(false)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const options = [];
    for (let i = 1; i <= 10; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }

    const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const description = options.map((o, i) => `${numbers[i]} **${o}** — 0 votes`).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(`📊 ${question}`)
      .setDescription(description)
      .setFooter({ text: `Poll by ${interaction.user.tag}` })
      .setTimestamp();

    // Create button rows for voting
    const rows = [];
    let row = new ActionRowBuilder();
    for (let i = 0; i < options.length; i++) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_${interaction.id}_${i}`)
          .setLabel(`${i + 1}`)
          .setStyle(ButtonStyle.Secondary)
      );
      if ((i + 1) % 5 === 0 || i === options.length - 1) {
        rows.push(row);
        if (i < options.length - 1) row = new ActionRowBuilder();
      }
    }

    // Store poll data on the client
    interaction.client.polls = interaction.client.polls || new Map();
    interaction.client.polls.set(interaction.id, {
      question,
      options,
      votes: new Map(), // userId -> optionIndex
      results: new Array(options.length).fill(0),
    });

    interaction.reply({ embeds: [embed], components: rows });
  }
};
