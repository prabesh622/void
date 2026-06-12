const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const WORDS = [
  'javascript','minecraft','keyboard','algorithm','elephant','galaxy','pyramid','volcano',
  'treasure','dinosaur','backpack','umbrella','adventure','champion','discovery','envelope',
  'festival','guardian','hurricane','illusion','journals','kingdom','labyrinth','mountain',
  'notebook','overflow','password','question','rainbow','sandwich','tropical','universe',
  'vacation','waterfall','xylophone','yesterday','zombies','abstract','building','calendar',
  'database','equation','firework','generate','handshake','internet','juggling','language',
  'midnight','neighbor','operator','paradise','quantity','register','skeleton','telephone'
];

const MAX_WRONG = 6;

function drawHangman(wrong) {
  const stages = [
    '```\n  ┌───┐\n  │   │\n  │\n  │\n  │\n══╧══\n```',
    '```\n  ┌───┐\n  │   │\n  │   O\n  │\n  │\n══╧══\n```',
    '```\n  ┌───┐\n  │   │\n  │   O\n  │   │\n  │\n══╧══\n```',
    '```\n  ┌───┐\n  │   │\n  │   O\n  │  /│\n  │\n══╧══\n```',
    '```\n  ┌───┐\n  │   │\n  │   O\n  │  /│\\\n  │\n══╧══\n```',
    '```\n  ┌───┐\n  │   │\n  │   O\n  │  /│\\\n  │  /\n══╧══\n```',
    '```\n  ┌───┐\n  │   │\n  │   O\n  │  /│\\\n  │  / \\\n══╧══\n```',
  ];
  return stages[Math.min(wrong, stages.length - 1)];
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('Play hangman — guess the word letter by letter!'),

  async execute(interaction) {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)].toLowerCase();
    const guessed = new Set();
    let wrong = 0;

    function getDisplay() {
      return word.split('').map(c => guessed.has(c) ? c.toUpperCase() : '\\_').join(' ');
    }

    function makeButtons(page = 0) {
      const start = page * 13;
      const letters = LETTERS.slice(start, start + 13);
      const row1 = new ActionRowBuilder();
      const row2 = new ActionRowBuilder();
      letters.forEach((l, i) => {
        const btn = new ButtonBuilder()
          .setCustomId(`hm_${l}`)
          .setLabel(l.toUpperCase())
          .setStyle(guessed.has(l) ? (word.includes(l) ? ButtonStyle.Success : ButtonStyle.Danger) : ButtonStyle.Secondary)
          .setDisabled(guessed.has(l));
        if (i < 7) row1.addComponents(btn);
        else row2.addComponents(btn);
      });
      // Add page buttons if needed
      if (page === 0 && LETTERS.length > 13) {
        row2.addComponents(new ButtonBuilder().setCustomId('hm_page1').setLabel('Next →').setStyle(ButtonStyle.Primary));
      } else if (page === 1) {
        row2.addComponents(new ButtonBuilder().setCustomId('hm_page0').setLabel('← Back').setStyle(ButtonStyle.Primary));
      }
      return [row1, row2];
    }

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle('🎮 Hangman')
      .setDescription(`${drawHangman(wrong)}\n**Word:** ${getDisplay()}\n\n**Wrong guesses:** 0/${MAX_WRONG}\n**Guessed:** None`)
      .setFooter({ text: `${interaction.user.tag}'s game` })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: makeButtons(0), fetchReply: true });

    const collector = msg.createMessageComponentCollector({ time: 180000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'Start your own game with `/hangman`!', ephemeral: true });
      }

      // Page navigation
      if (i.customId.startsWith('hm_page')) {
        const page = parseInt(i.customId.replace('hm_page', ''));
        i.update({ components: makeButtons(page) }).catch(() => {});
        return;
      }

      const letter = i.customId.replace('hm_', '');
      if (guessed.has(letter)) return i.reply({ content: 'Already guessed!', ephemeral: true });

      guessed.add(letter);

      if (!word.includes(letter)) {
        wrong++;
      }

      // Check win
      const won = word.split('').every(c => guessed.has(c));
      // Check lose
      const lost = wrong >= MAX_WRONG;

      if (won) {
        const winEmbed = new EmbedBuilder()
          .setColor(0x00d26a)
          .setTitle('🎉 You Won!')
          .setDescription(`${drawHangman(wrong)}\n**Word:** ${word.toUpperCase()}\n\n*Guessed in ${guessed.size} tries with ${wrong} wrong!*`)
          .setTimestamp();
        i.update({ embeds: [winEmbed], components: [] }).catch(() => {});
        collector.stop();
      } else if (lost) {
        const loseEmbed = new EmbedBuilder()
          .setColor(0xff4757)
          .setTitle('💀 Game Over!')
          .setDescription(`${drawHangman(wrong)}\nThe word was: **${word.toUpperCase()}**`)
          .setTimestamp();
        i.update({ embeds: [loseEmbed], components: [] }).catch(() => {});
        collector.stop();
      } else {
        const guessedList = [...guessed].sort().join(', ') || 'None';
        const contEmbed = new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('🎮 Hangman')
          .setDescription(`${drawHangman(wrong)}\n**Word:** ${getDisplay()}\n\n**Wrong guesses:** ${wrong}/${MAX_WRONG}\n**Guessed:** ${guessedList}`)
          .setFooter({ text: `${interaction.user.tag}'s game` })
          .setTimestamp();
        i.update({ embeds: [contEmbed], components: makeButtons(0) }).catch(() => {});
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        msg.edit({ embeds: [new EmbedBuilder().setColor(0xff4757).setTitle('⏰ Time Up!').setDescription(`The word was: **${word.toUpperCase()}**`)], components: [] }).catch(() => {});
      }
    });
  }
};
