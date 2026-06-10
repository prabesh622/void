const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something')
    .addStringOption(opt => opt.setName('message').setDescription('The message to send').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send in (default: current)').setRequired(false))
    .addBooleanOption(opt => opt.setName('embed').setDescription('Send as embed (default: false)').setRequired(false))
    .addStringOption(opt => opt.setName('color').setDescription('Embed color hex (e.g. #ff0000)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const asEmbed = interaction.options.getBoolean('embed') || false;
    const color = interaction.options.getString('color');

    if (asEmbed) {
      const hexColor = color ? parseInt(color.replace('#', ''), 16) : 0x3b82f6;
      const embed = new EmbedBuilder()
        .setColor(isNaN(hexColor) ? 0x3b82f6 : hexColor)
        .setDescription(message)
        .setTimestamp();
      await channel.send({ embeds: [embed] });
    } else {
      await channel.send({ content: message });
    }

    interaction.reply({ embeds: [successEmbed('Message Sent', `Message sent to <#${channel.id}>.`)], ephemeral: true });
  }
};
