const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const EMPTY = '⬛';
const X_MARK = '❌';
const O_MARK = '⭕';

function buildBoard(board) {
  const symbols = board.map(c => c === 'X' ? X_MARK : c === 'O' ? O_MARK : EMPTY);
  return `${symbols[0]}${symbols[1]}${symbols[2]}\n${symbols[3]}${symbols[4]}${symbols[5]}\n${symbols[6]}${symbols[7]}${symbols[8]}`;
}

function checkWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diag
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(c => c !== '')) return 'tie';
  return null;
}

function botMove(board) {
  // Try to win
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      board[i] = 'O';
      if (checkWinner(board) === 'O') { board[i] = ''; return i; }
      board[i] = '';
    }
  }
  // Try to block
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      board[i] = 'X';
      if (checkWinner(board) === 'X') { board[i] = ''; return i; }
      board[i] = '';
    }
  }
  // Center
  if (board[4] === '') return 4;
  // Corners
  const corners = [0,2,6,8].filter(i => board[i] === '');
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  // Any
  const empty = board.map((c,i) => c === '' ? i : -1).filter(i => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Play Tic-Tac-Toe against the bot!'),

  async execute(interaction) {
    const board = Array(9).fill('');
    let turn = 'X'; // Player is X, bot is O

    function makeButtons() {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 3; c++) {
          const idx = r * 3 + c;
          const btn = new ButtonBuilder()
            .setCustomId(`ttt_${idx}`)
            .setLabel(board[idx] || ' ')
            .setStyle(board[idx] === 'X' ? ButtonStyle.Primary : board[idx] === 'O' ? ButtonStyle.Danger : ButtonStyle.Secondary)
            .setDisabled(board[idx] !== '');
          row.addComponents(btn);
        }
        rows.push(row);
      }
      return rows;
    }

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle('❌⭕ Tic-Tac-Toe')
      .setDescription(`${buildBoard(board)}\n\n**Your turn!** (You are ❌)`)
      .setFooter({ text: `${interaction.user.tag} vs Bot` })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], components: makeButtons(), fetchReply: true });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'This is not your game! Start your own with `/tictactoe`.', ephemeral: true });
      }

      const idx = parseInt(i.customId.replace('ttt_', ''));
      if (board[idx] !== '') return i.reply({ content: 'That spot is taken!', ephemeral: true });

      // Player move
      board[idx] = 'X';
      let result = checkWinner(board);

      if (result === 'X') {
        const winEmbed = new EmbedBuilder().setColor(0x00d26a).setTitle('🎉 You Win!').setDescription(`${buildBoard(board)}\n\n**Congratulations!**`).setTimestamp();
        i.update({ embeds: [winEmbed], components: [] }).catch(() => {});
        collector.stop();
        return;
      } else if (result === 'tie') {
        const tieEmbed = new EmbedBuilder().setColor(0xffa502).setTitle("🤝 It's a Tie!").setDescription(`${buildBoard(board)}`).setTimestamp();
        i.update({ embeds: [tieEmbed], components: [] }).catch(() => {});
        collector.stop();
        return;
      }

      // Bot move
      setTimeout(async () => {
        const botIdx = botMove([...board]);
        board[botIdx] = 'O';
        result = checkWinner(board);

        if (result === 'O') {
          const loseEmbed = new EmbedBuilder().setColor(0xff4757).setTitle('😢 Bot Wins!').setDescription(`${buildBoard(board)}\n\nBetter luck next time!`).setTimestamp();
          try { await i.editReply({ embeds: [loseEmbed], components: [] }); } catch {}
          collector.stop();
        } else if (result === 'tie') {
          const tieEmbed = new EmbedBuilder().setColor(0xffa502).setTitle("🤝 It's a Tie!").setDescription(`${buildBoard(board)}`).setTimestamp();
          try { await i.editReply({ embeds: [tieEmbed], components: [] }); } catch {}
          collector.stop();
        } else {
          const contEmbed = new EmbedBuilder().setColor(0x3b82f6).setTitle('❌⭕ Tic-Tac-Toe').setDescription(`${buildBoard(board)}\n\n**Your turn!**`).setTimestamp();
          try { await i.update({ embeds: [contEmbed], components: makeButtons() }); } catch {}
        }
      }, 800);
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        msg.edit({ embeds: [new EmbedBuilder().setColor(0xff4757).setTitle('⏰ Game Over').setDescription('Game timed out after 60 seconds.')], components: [] }).catch(() => {});
      }
    });
  }
};
