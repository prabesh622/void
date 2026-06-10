const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const responses = [
  'Yes, definitely!',
  'Absolutely!',
  'Without a doubt.',
  'Yes, you can count on it.',
  'Most likely.',
  'Outlook good.',
  'Signs point to yes.',
  'As I see it, yes.',
  'It is certain.',
  'You may rely on it.',
  'Reply hazy, try again.',
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  'Concentrate and ask again.',
  'Don\'t count on it.',
  'My reply is no.',
  'My sources say no.',
  'Outlook not so good.',
  'Very doubtful.',
  'No way!',
  'Forget about it.',
  'Not a chance.',
  'I highly doubt it.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(opt => opt.setName('question').setDescription('Your question').setRequired(true)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const answer = responses[Math.floor(Math.random() * responses.length)];

    const embed = new EmbedBuilder()
      .setColor(0x6c5ce7)
      .setTitle('🎱 Magic 8-Ball')
      .addFields(
        { name: 'Question', value: question, inline: false },
        { name: 'Answer', value: answer, inline: false },
      )
      .setFooter({ text: `Asked by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
