const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play Rock Paper Scissors against the bot'),

  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rps_rock').setLabel('Rock').setStyle(ButtonStyle.Primary).setEmoji('🪨'),
      new ButtonBuilder().setCustomId('rps_paper').setLabel('Paper').setStyle(ButtonStyle.Primary).setEmoji('📄'),
      new ButtonBuilder().setCustomId('rps_scissors').setLabel('Scissors').setStyle(ButtonStyle.Primary).setEmoji('✂️'),
    );

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle('✊ Rock Paper Scissors')
      .setDescription('Choose your weapon!')
      .setFooter({ text: `${interaction.user.tag} vs Bot` })
      .setTimestamp();

    interaction.reply({ embeds: [embed], components: [row], fetchReply: true }).then(msg => {
      const collector = msg.createMessageComponentCollector({ time: 30000, max: 1 });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) return i.reply({ content: "Start your own game with `/rps`!", ephemeral: true });

        const userChoice = i.customId.replace('rps_', '');
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * 3)];
        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

        let result;
        if (userChoice === botChoice) result = "It's a tie!";
        else if ((userChoice === 'rock' && botChoice === 'scissors') || (userChoice === 'paper' && botChoice === 'rock') || (userChoice === 'scissors' && botChoice === 'paper')) result = 'You win!';
        else result = 'You lose!';

        const color = result.includes('win') ? 0x00d26a : result.includes('lose') ? 0xff4757 : 0xffa502;

        const resultEmbed = new EmbedBuilder()
          .setColor(color)
          .setTitle('✊ Rock Paper Scissors')
          .setDescription(`You: ${emojis[userChoice]} **${userChoice}**\nBot: ${emojis[botChoice]} **${botChoice}**\n\n### ${result}`)
          .setTimestamp();

        i.update({ embeds: [resultEmbed], components: [] });
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          msg.edit({ embeds: [new EmbedBuilder().setColor(0xff4757).setTitle('⏰ Timed Out').setDescription('You took too long!')], components: [] }).catch(() => {});
        }
      });
    });
  }
};
