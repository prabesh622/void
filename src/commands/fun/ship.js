const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const OWNER_ID = '1101811921340080148';

const SHIP_COMMENTS = [
  { min: 90, text: '💕 A match made in heaven! You two are perfect together!', emoji: '💖' },
  { min: 75, text: '😍 Great chemistry! This could really work out!', emoji: '💗' },
  { min: 60, text: '😊 Not bad at all! There\'s definitely a spark here.', emoji: '💛' },
  { min: 45, text: '🤔 It could go either way... Give it a try!', emoji: '💫' },
  { min: 30, text: '😬 Not the best match, but stranger things have happened.', emoji: '💔' },
  { min: 15, text: '😅 Maybe just friends? Friendship is valuable too!', emoji: '🥀' },
  { min: 0,  text: '💀 Absolutely not. The universe says NO.', emoji: '🚫' },
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Calculate love compatibility between two users')
    .addUserOption(o => o.setName('user1').setDescription('First person').setRequired(true))
    .addUserOption(o => o.setName('user2').setDescription('Second person (default: you)').setRequired(false)),

  async execute(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2') || interaction.user;

    if (user1.id === OWNER_ID || user2.id === OWNER_ID) {
      return interaction.reply({ content: "You can't ship the owner! 👑 They're untouchable!", ephemeral: true });
    }

    // Deterministic percentage based on both user IDs
    const combined = [user1.id, user2.id].sort().join('');
    const percentage = hashCode(combined) % 101;

    const comment = SHIP_COMMENTS.find(c => percentage >= c.min);

    // Build the progress bar
    const filled = Math.round(percentage / 5);
    const bar = '❤️'.repeat(filled) + '🖤'.repeat(20 - filled);

    const embed = new EmbedBuilder()
      .setColor(percentage >= 50 ? 0xff6b81 : 0x747d8c)
      .setTitle(`${comment.emoji} Love Calculator`)
      .setDescription(`**${user1.username}** × **${user2.username}**\n\n${bar}\n### ${percentage}% Match\n\n*${comment.text}*`)
      .setThumbnail(user1.displayAvatarURL())
      .setImage(user2.displayAvatarURL({ size: 128 }))
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
