const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const RESPONSES = [
  { text: 'It is certain.', type: 'yes' },
  { text: 'It is decidedly so.', type: 'yes' },
  { text: 'Without a doubt.', type: 'yes' },
  { text: 'Yes, definitely.', type: 'yes' },
  { text: 'You may rely on it.', type: 'yes' },
  { text: 'As I see it, yes.', type: 'yes' },
  { text: 'Most likely.', type: 'yes' },
  { text: 'Outlook good.', type: 'yes' },
  { text: 'Yes.', type: 'yes' },
  { text: 'Signs point to yes.', type: 'yes' },
  { text: 'Reply hazy, try again.', type: 'maybe' },
  { text: 'Ask again later.', type: 'maybe' },
  { text: 'Better not tell you now.', type: 'maybe' },
  { text: 'Cannot predict now.', type: 'maybe' },
  { text: 'Concentrate and ask again.', type: 'maybe' },
  { text: "Don't count on it.", type: 'no' },
  { text: 'My reply is no.', type: 'no' },
  { text: 'My sources say no.', type: 'no' },
  { text: 'Outlook not so good.', type: 'no' },
  { text: 'Very doubtful.', type: 'no' },
];

const COLORS = { yes: 0x00d26a, maybe: 0xffa502, no: 0xff4757 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the Magic 8-Ball a question')
    .addStringOption(o => o.setName('question').setDescription('Your yes/no question').setRequired(true)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

    const embed = new EmbedBuilder()
      .setColor(COLORS[response.type])
      .setTitle('🎱 Magic 8-Ball')
      .setDescription(`**Question:** ${question}\n\n**Answer:** ${response.text}`)
      .setFooter({ text: `Asked by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
