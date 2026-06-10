const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a user\'s avatar')
    .addUserOption(opt => opt.setName('user').setDescription('The user to show avatar of').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(user.id);

    const avatarURL = user.displayAvatarURL({ dynamic: true, size: 512 });

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(avatarURL)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
