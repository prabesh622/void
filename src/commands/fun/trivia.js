const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const TRIVIA_BANK = [
  { q: 'What planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 1 },
  { q: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
  { q: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Michelangelo'], answer: 2 },
  { q: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2 },
  { q: 'Which country has the most population?', options: ['USA', 'India', 'China', 'Indonesia'], answer: 1 },
  { q: 'What is the speed of light?', options: ['300k km/s', '150k km/s', '500k km/s', '1M km/s'], answer: 0 },
  { q: 'How many bones are in the human body?', options: ['106', '206', '306', '186'], answer: 1 },
  { q: 'What year did World War II end?', options: ['1943', '1944', '1945', '1946'], answer: 2 },
  { q: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], answer: 1 },
  { q: 'Which element has the symbol "O"?', options: ['Osmium', 'Oganesson', 'Oxygen', 'Gold'], answer: 2 },
  { q: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Titanium'], answer: 2 },
  { q: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2 },
  { q: 'What gas do plants absorb?', options: ['Oxygen', 'Nitrogen', 'CO2', 'Helium'], answer: 2 },
  { q: 'Who wrote Romeo and Juliet?', options: ['Dickens', 'Shakespeare', 'Twain', 'Austen'], answer: 1 },
  { q: 'What is the tallest mountain?', options: ['K2', 'Kangchenjunga', 'Everest', 'Lhotse'], answer: 2 },
  { q: 'Which blood type is the universal donor?', options: ['A', 'B', 'AB', 'O-'], answer: 3 },
  { q: 'How many strings does a guitar have?', options: ['4', '5', '6', '8'], answer: 2 },
  { q: 'What is the currency of Japan?', options: ['Won', 'Yuan', 'Yen', 'Ringgit'], answer: 2 },
  { q: 'Which planet has the most moons?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], answer: 1 },
  { q: 'What year was the first iPhone released?', options: ['2005', '2006', '2007', '2008'], answer: 2 },
];

const NUMBERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

/** Active trivia sessions: channelId -> { question, answer, scores, endTime } */
const triviaSessions = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Start a trivia quiz game!')
    .addIntegerOption(opt => opt.setName('rounds').setDescription('Number of rounds (1-10, default 5)').setMinValue(1).setMaxValue(10).setRequired(false))
    .addStringOption(opt => opt.setName('time').setDescription('Time per question').setRequired(false)
      .addChoices({ name: '15s', value: '15' }, { name: '20s', value: '20' }, { name: '30s', value: '30' })),

  async execute(interaction) {
    const rounds = interaction.options.getInteger('rounds') || 5;
    const timePerQ = parseInt(interaction.options.getString('time') || '20') * 1000;
    const channel = interaction.channel;

    if (triviaSessions.has(channel.id)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('A trivia game is already running here!')], ephemeral: true });
    }

    // Pick random questions
    const shuffled = [...TRIVIA_BANK].sort(() => Math.random() - 0.5);
    const questions = shuffled.slice(0, Math.min(rounds, shuffled.length));

    triviaSessions.set(channel.id, {
      scores: new Map(),
      current: 0,
      questions,
      totalRounds: questions.length,
      startedBy: interaction.user.id,
    });

    const session = triviaSessions.get(channel.id);

    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x6c5ce7).setTitle('🧠 Trivia Game').setDescription(`Starting **${questions.length}** rounds of trivia!\nAnswer by clicking the buttons.\nEach correct answer = **1 point**\n\nFirst question incoming...`)] });

    // Run rounds
    for (let i = 0; i < questions.length; i++) {
      session.current = i;
      const q = questions[i];

      const embed = new EmbedBuilder()
        .setColor(0x6c5ce7)
        .setTitle(`🧠 Trivia — Round ${i + 1}/${questions.length}`)
        .setDescription(`**${q.q}**\n\n${q.options.map((o, idx) => `${NUMBERS[idx]} ${o}`).join('\n')}`)
        .setFooter({ text: `${timePerQ / 1000}s to answer` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        ...q.options.map((_, idx) => new ButtonBuilder().setCustomId(`trivia_${channel.id}_${idx}`).setLabel(`${idx + 1}`).setStyle(ButtonStyle.Primary).setEmoji(NUMBERS[idx]))
      );

      const msg = await channel.send({ embeds: [embed], components: [row] });

      // Collect answers
      const collector = msg.createMessageComponentCollector({
        filter: int => int.customId.startsWith(`trivia_${channel.id}_`),
        time: timePerQ,
      });

      const answered = new Set();
      collector.on('collect', async int => {
        if (answered.has(int.user.id)) return int.reply({ content: 'Already answered!', ephemeral: true });
        answered.add(int.user.id);

        const choice = parseInt(int.customId.split('_').pop());
        if (choice === q.answer) {
          session.scores.set(int.user.id, (session.scores.get(int.user.id) || 0) + 1);
          int.reply({ content: `✅ Correct! +1 point`, ephemeral: true });
        } else {
          int.reply({ content: `❌ Wrong! The answer was **${q.options[q.answer]}**`, ephemeral: true });
        }
      });

      // Wait for collector to end
      await new Promise(resolve => collector.on('end', resolve));

      // Show answer
      await msg.edit({
        embeds: [new EmbedBuilder().setColor(0x00d26a).setTitle(`🧠 Answer: ${q.options[q.answer]}`).setDescription(`Round ${i + 1} complete!`)],
        components: [],
      }).catch(() => {});

      if (i < questions.length - 1) {
        await channel.send({ content: `Next question in 3 seconds...` }).then(m => setTimeout(() => m.delete().catch(() => {}), 2000));
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Final scoreboard
    const sorted = [...session.scores.entries()].sort((a, b) => b[1] - a[1]);
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const board = sorted.length > 0
      ? sorted.slice(0, 10).map(([uid, score], i) => `${medals[i] || '•'} <@${uid}> — **${score}**/${questions.length}`).join('\n')
      : 'Nobody scored any points!';

    const winner = sorted[0];

    channel.send({
      embeds: [new EmbedBuilder()
        .setColor(0xffa502)
        .setTitle('🧠 Trivia Complete!')
        .setDescription(`**Winner:** ${winner ? `<@${winner[0]}> with **${winner[1]}** points!` : 'Nobody'}\n\n**Scoreboard:**\n${board}`)
        .setFooter({ text: `${questions.length} rounds played` })
        .setTimestamp()]
    });

    triviaSessions.delete(channel.id);
  },

  triviaSessions,
};
