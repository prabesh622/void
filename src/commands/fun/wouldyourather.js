const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const QUESTIONS = [
  { a: 'Fly like a bird', b: 'Swim like a fish' },
  { a: 'Be invisible', b: 'Read minds' },
  { a: 'Live in the past', b: 'Live in the future' },
  { a: 'Always be cold', b: 'Always be hot' },
  { a: 'Speak every language', b: 'Play every instrument' },
  { a: 'Have super strength', b: 'Have super speed' },
  { a: 'Never sleep again', b: 'Never eat again' },
  { a: 'Be the funniest person alive', b: 'Be the smartest person alive' },
  { a: 'Live without music', b: 'Live without movies' },
  { a: 'Have unlimited money', b: 'Have unlimited knowledge' },
  { a: 'Be famous but lonely', b: 'Be unknown but loved' },
  { a: 'Travel to space', b: 'Explore the deep ocean' },
  { a: 'Always tell the truth', b: 'Always get away with lies' },
  { a: 'Have no phone forever', b: 'Have no internet forever' },
  { a: 'Be a superhero', b: 'Be a supervillain' },
  { a: 'Live 200 years', b: 'Live 50 years but as a billionaire' },
  { a: 'Have free WiFi everywhere', b: 'Have free coffee everywhere' },
  { a: 'Never wait in line again', b: 'Never sit in traffic again' },
  { a: 'Be able to talk to animals', b: 'Be able to talk to ghosts' },
  { a: 'Always have to sing instead of speak', b: 'Always have to dance instead of walk' },
  { a: 'Have a pause button for life', b: 'Have a rewind button for life' },
  { a: 'Eat pizza every day', b: 'Eat sushi every day' },
  { a: 'Be 10 years older', b: 'Be 10 years younger' },
  { a: 'Live in a treehouse', b: 'Live in a submarine' },
  { a: 'Have a pet dragon', b: 'Have a pet dinosaur' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wouldyourather')
    .setDescription('Would you rather? Vote with buttons!'),

  async execute(interaction, client) {
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    client.wyr = client.wyr || new Map();

    const pollId = `${Date.now()}-${interaction.channel.id}`;
    client.wyr.set(pollId, { a: 0, b: 0, voters: new Set() });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`wyr_a_${pollId}`).setLabel(`Option A`).setStyle(ButtonStyle.Primary).setEmoji('🅰️'),
      new ButtonBuilder().setCustomId(`wyr_b_${pollId}`).setLabel(`Option B`).setStyle(ButtonStyle.Danger).setEmoji('🅱️'),
    );

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🤔 Would You Rather...')
      .setDescription(`🅰️ **${q.a}**\n*— or —*\n🅱️ **${q.b}**\n\n*Click a button to vote!*`)
      .setFooter({ text: `Asked by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed], components: [row], fetchReply: true }).then(async msg => {
      // Collector for button votes
      const collector = msg.createMessageComponentCollector({ time: 120000 });
      collector.on('collect', async i => {
        const poll = client.wyr.get(pollId);
        if (!poll) return i.reply({ content: 'This poll has ended.', ephemeral: true });
        if (poll.voters.has(i.user.id)) return i.reply({ content: 'You already voted!', ephemeral: true });

        poll.voters.add(i.user.id);
        if (i.customId.startsWith('wyr_a_')) poll.a++;
        else poll.b++;

        const total = poll.a + poll.b;
        const aP = Math.round((poll.a / total) * 100);
        const bP = Math.round((poll.b / total) * 100);
        const aBar = '🟦'.repeat(Math.round(aP / 10)) + '⬛'.repeat(10 - Math.round(aP / 10));
        const bBar = '🟥'.repeat(Math.round(bP / 10)) + '⬛'.repeat(10 - Math.round(bP / 10));

        const updated = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle('🤔 Would You Rather...')
          .setDescription(`🅰️ **${q.a}**\n${aBar} ${aP}% (${poll.a} votes)\n\n🅱️ **${q.b}**\n${bBar} ${bP}% (${poll.b} votes)`)
          .setFooter({ text: `${total} total votes` })
          .setTimestamp();

        i.update({ embeds: [updated] }).catch(() => {});
      });

      collector.on('end', () => {
        const poll = client.wyr.get(pollId);
        if (!poll) return;
        const total = poll.a + poll.b;
        if (total === 0) return;
        const winner = poll.a > poll.b ? `🅰️ **${q.a}**` : poll.b > poll.a ? `🅱️ **${q.b}**` : "It's a tie!";
        const final = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle('🤔 Would You Rather... (Results)')
          .setDescription(`${winner} wins!\n\n🅰️ ${q.a}: **${poll.a}** votes\n🅱️ ${q.b}: **${poll.b}** votes\n\n*Total: ${total} votes*`)
          .setTimestamp();
        msg.edit({ embeds: [final], components: [] }).catch(() => {});
        client.wyr.delete(pollId);
      });
    });
  }
};
