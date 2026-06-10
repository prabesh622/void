const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('countdown')
    .setDescription('Start a countdown timer in a channel')
    .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes (1-60)').setMinValue(1).setMaxValue(60).setRequired(true))
    .addStringOption(opt => opt.setName('label').setDescription('What are we counting down to?').setRequired(false))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel for the countdown').addChannelTypes(ChannelType.GuildText).setRequired(false)),

  async execute(interaction) {
    const minutes = interaction.options.getInteger('minutes');
    const label = interaction.options.getString('label') || 'Event';
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const totalSeconds = minutes * 60;
    const endTime = Date.now() + totalSeconds * 1000;

    const embed = new EmbedBuilder()
      .setColor(0xffa502)
      .setTitle(`⏰ ${label}`)
      .setDescription(`Countdown: **${minutes} minute(s)**\nEnds: <t:${Math.floor(endTime / 1000)}:R>`)
      .addFields(
        { name: 'Time Remaining', value: formatTime(totalSeconds), inline: true },
        { name: 'Started By', value: `<@${interaction.user.id}>`, inline: true },
      )
      .setFooter({ text: `${interaction.guild.name}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`countdown_cancel_${channel.id}`).setLabel('Cancel').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });

    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00d26a).setDescription(`Countdown started in <#${channel.id}>!`)], ephemeral: true });

    // Update countdown every 30 seconds
    const interval = setInterval(async () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      if (remaining <= 0) {
        clearInterval(interval);
        // Countdown complete!
        msg.edit({
          embeds: [new EmbedBuilder().setColor(0x00d26a).setTitle(`🎉 ${label} — Time's Up!`).setDescription(`The countdown has ended!`).setTimestamp()],
          components: [],
        }).catch(() => {});
        channel.send({ content: `🎉 **${label}** — Time's up! <@${interaction.user.id}>` });
        return;
      }

      // Only update embed every 30s to avoid rate limits
      msg.edit({
        embeds: [new EmbedBuilder()
          .setColor(0xffa502)
          .setTitle(`⏰ ${label}`)
          .setDescription(`Countdown: **${minutes} minute(s)**\nEnds: <t:${Math.floor(endTime / 1000)}:R>`)
          .addFields(
            { name: 'Time Remaining', value: formatTime(remaining), inline: true },
            { name: 'Started By', value: `<@${interaction.user.id}>`, inline: true },
          )
          .setFooter({ text: `${interaction.guild.name}` })
          .setTimestamp()
        ]
      }).catch(() => clearInterval(interval));
    }, 30000);

    // Store interval for cancellation
    if (!interaction.client.countdowns) interaction.client.countdowns = new Map();
    interaction.client.countdowns.set(channel.id, { interval, endTime, label, startedBy: interaction.user.id });
  },
};

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
