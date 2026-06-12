const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const OWNER_ID = '1101811921340080148';

const COMPLIMENTS = [
  "You light up every room you walk into! ✨",
  "Your smile is contagious! 😊",
  "You're stronger than you think! 💪",
  "The world is better because you're in it! 🌍",
  "You're an amazing friend! 🤝",
  "Your creativity is inspiring! 🎨",
  "You have a heart of gold! 💛",
  "You're a true champion! 🏆",
  "Your positive energy is unmatched! ⚡",
  "You make everyone around you feel special! 🌟",
  "You're basically a human sunshine! ☀️",
  "Your kindness makes the world a better place! 🌈",
  "You're the kind of person people write songs about! 🎵",
  "Your brain is incredible — never stop thinking! 🧠",
  "You have impeccable taste! 👌",
  "You're the MVP of every group you're in! 🥇",
  "Your vibe is immaculate! 💫",
  "You could make anyone's day better just by saying hi! 👋",
  "You're proof that good people exist! 🙌",
  "Your potential is limitless! 🚀",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Give someone a nice compliment')
    .addUserOption(o => o.setName('user').setDescription('User to compliment (optional)').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');

    if (target && target.id === OWNER_ID) {
      return interaction.reply({ content: "You can't compliment the owner! 👑 They're untouchable!", ephemeral: true });
    }

    const compliment = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];

    const mention = target ? `<@${target.id}>, ` : '';

    const embed = new EmbedBuilder()
      .setColor(0xff6b81)
      .setTitle('💝 Compliment')
      .setDescription(`${mention}${compliment}`)
      .setFooter({ text: `From ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
