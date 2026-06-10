const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const WORDS = [
  'discord', 'javascript', 'programming', 'galaxy', 'mountain', 'keyboard', 'computer',
  'diamond', 'adventure', 'champion', 'warrior', 'elephant', 'dolphin', 'phoenix',
  'lightning', 'shadow', 'crystal', 'mystery', 'treasure', 'kingdom', 'dragon',
  'volcano', 'hurricane', 'midnight', 'rainbow', 'quantum', 'universe', 'ninja',
  'samurai', 'wizard', 'pirate', 'astronaut', 'detective', 'robot', 'monster',
  'chocolate', 'avocado', 'pineapple', 'strawberry', 'watermelon', 'cinnamon',
  'algorithm', 'database', 'network', 'security', 'browser', 'server',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scramble')
    .setDescription('Word scramble game! Unscramble the word.')
    .addIntegerOption(opt => opt.setName('rounds').setDescription('Number of rounds (1-10, default 5)').setMinValue(1).setMaxValue(10).setRequired(false)),

  async execute(interaction) {
    const rounds = interaction.options.getInteger('rounds') || 5;
    const channel = interaction.channel;

    const shuffled = [...WORDS].sort(() => Math.random() - 0.5).slice(0, rounds);
    const scores = new Map();

    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x6c5ce7).setTitle('🔤 Word Scramble').setDescription(`**${rounds}** rounds starting! Type your answer in the chat.\nFirst to get it right wins the round!`)] });

    for (let i = 0; i < shuffled.length; i++) {
      const word = shuffled[i];
      const scrambled = scrambleWord(word);

      const embed = new EmbedBuilder()
        .setColor(0x6c5ce7)
        .setTitle(`🔤 Round ${i + 1}/${rounds}`)
        .setDescription(`Unscramble: **${scrambled}**\n\n*Hint: ${word.length} letters*\nType your answer below!`)
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      // Wait for correct answer
      const answer = await new Promise(resolve => {
        const collector = channel.createMessageCollector({
          filter: m => !m.author.bot && m.content.toLowerCase().trim() === word.toLowerCase(),
          time: 30000,
          max: 1,
        });
        collector.on('collect', m => {
          resolve({ winner: m.author, message: m });
          collector.stop('found');
        });
        collector.on('end', (_, reason) => {
          if (reason !== 'found') resolve(null);
        });
      });

      if (answer) {
        scores.set(answer.winner.id, (scores.get(answer.winner.id) || 0) + 1);
        await channel.send({ embeds: [new EmbedBuilder().setColor(0x00d26a).setDescription(`✅ **${answer.winner.tag}** got it! The word was **${word}**!`)] });
      } else {
        await channel.send({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription(`⏰ Time's up! The word was **${word}**.`)] });
      }

      if (i < rounds - 1) {
        await channel.send({ content: 'Next word in 3 seconds...' });
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Final scoreboard
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const board = sorted.length > 0
      ? sorted.slice(0, 10).map(([uid, score], i) => `${medals[i] || '•'} <@${uid}> — **${score}**/${rounds}`).join('\n')
      : 'Nobody got any words right!';
    const winner = sorted[0];

    channel.send({
      embeds: [new EmbedBuilder()
        .setColor(0xffa502)
        .setTitle('🔤 Scramble Complete!')
        .setDescription(`**Winner:** ${winner ? `<@${winner[0]}> with **${winner[1]}** points!` : 'Nobody'}\n\n**Scoreboard:**\n${board}`)
        .setTimestamp()]
    });
  },
};

function scrambleWord(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const result = arr.join('');
  // Make sure it's actually different
  if (result === word) return scrambleWord(word);
  return result;
}
