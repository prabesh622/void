const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const reminders = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Set a reminder')
    .addStringOption(o => o.setName('text').setDescription('What to remind you about').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Minutes from now').setRequired(true).setMinValue(1).setMaxValue(1440)),

  async execute(interaction) {
    const text = interaction.options.getString('text');
    const minutes = interaction.options.getInteger('minutes');
    const ms = minutes * 60 * 1000;

    const embed = new EmbedBuilder()
      .setColor(0x00d26a)
      .setTitle('⏰ Reminder Set!')
      .setDescription(`**Reminder:** ${text.slice(0, 500)}\n**In:** ${minutes} minute${minutes > 1 ? 's' : ''}\n**At:** <t:${Math.floor((Date.now() + ms) / 1000)}:F>`)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const timeout = setTimeout(async () => {
      try {
        const reminderEmbed = new EmbedBuilder()
          .setColor(0xffa502)
          .setTitle('⏰ Reminder!')
          .setDescription(`**${text.slice(0, 500)}**\n\n*You set this reminder ${minutes} minutes ago.*`)
          .setTimestamp();

        await interaction.user.send({ content: `Hey <@${interaction.user.id}>! ⏰`, embeds: [reminderEmbed] }).catch(() => {
          // If DMs are closed, send in the original channel
          interaction.channel?.send({ content: `Hey <@${interaction.user.id}>! ⏰ You have a reminder!`, embeds: [reminderEmbed] }).catch(() => {});
        });
      } catch (err) {
        console.error('[Reminder] Error sending:', err.message);
      }
    }, ms);

    // Store so it can be cancelled
    const key = `${interaction.user.id}-${Date.now()}`;
    reminders.set(key, timeout);
  }
};
