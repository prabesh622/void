const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');
const Suggestion = require('../../schemas/Suggestion');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption(opt => opt.setName('content').setDescription('Your suggestion').setRequired(true)),

  async execute(interaction) {
    const content = interaction.options.getString('content');
    const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });

    if (!settings?.suggestions?.enabled || !settings.suggestions.channelId) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'Suggestion channel not configured. An admin needs to run `/suggestconfig`.')], ephemeral: true });
    }

    const channel = interaction.guild.channels.cache.get(settings.suggestions.channelId);
    if (!channel) return interaction.reply({ embeds: [errorEmbed('Error', 'Suggestion channel not found.')], ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle('New Suggestion')
      .setDescription(content)
      .addFields({ name: 'Submitted by', value: `<@${interaction.user.id}>`, inline: true }, { name: 'Status', value: 'Pending', inline: true })
      .setFooter({ text: `Suggestion from ${interaction.user.tag}` })
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    await msg.react('👍');
    await msg.react('👎');

    await Suggestion.create({
      guildId: interaction.guild.id,
      channelId: channel.id,
      messageId: msg.id,
      userId: interaction.user.id,
      content,
      status: 'pending',
    });

    interaction.reply({ embeds: [successEmbed('Suggestion Submitted', `Your suggestion has been posted to <#${channel.id}>.`)], ephemeral: true });
  }
};
