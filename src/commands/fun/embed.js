const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a custom embed message')
    .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(true))
    .addStringOption(o => o.setName('color').setDescription('Hex color (e.g. #ff0000)').setRequired(false))
    .addStringOption(o => o.setName('footer').setDescription('Footer text').setRequired(false))
    .addStringOption(o => o.setName('image').setDescription('Image URL').setRequired(false))
    .addStringOption(o => o.setName('thumbnail').setDescription('Thumbnail URL').setRequired(false))
    .addChannelOption(o => o.setName('channel').setDescription('Channel to send in (default: current)').setRequired(false))
    .addBooleanOption(o => o.setName('timestamp').setDescription('Add timestamp?').setRequired(false)),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const colorStr = interaction.options.getString('color') || '#3b82f6';
    const footer = interaction.options.getString('footer');
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const timestamp = interaction.options.getBoolean('timestamp') ?? true;

    let color = parseInt(colorStr.replace('#', ''), 16);
    if (isNaN(color)) color = 0x3b82f6;

    // Check channel permissions
    if (!channel.permissionsFor(interaction.client.user).has('SendMessages')) {
      return interaction.reply({ content: "I can't send messages in that channel.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);

    if (footer) embed.setFooter({ text: footer, iconURL: interaction.user.displayAvatarURL() });
    if (image) embed.setImage(image);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (timestamp) embed.setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
      if (channel.id !== interaction.channel.id) {
        interaction.reply({ content: `✅ Embed sent to <#${channel.id}>!`, ephemeral: true });
      } else {
        interaction.reply({ content: '✅ Embed created!', ephemeral: true });
      }
    } catch (err) {
      interaction.reply({ content: `Failed to send embed: ${err.message}`, ephemeral: true });
    }
  }
};
