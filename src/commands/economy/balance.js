const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Economy = require('../../schemas/Economy');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance or another member\'s balance')
    .addUserOption(opt => opt.setName('user').setDescription('The user to check').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getMember('user') || interaction.member;
    if (target.user.bot) return interaction.reply({ content: 'Bots don\'t have economy accounts.', ephemeral: true });

    let data = await Economy.findOne({ guildId: interaction.guild.id, userId: target.id });
    if (!data) data = await Economy.create({ guildId: interaction.guild.id, userId: target.id });

    const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
    const symbol = settings?.economy?.currencySymbol || '$';

    const embed = new EmbedBuilder()
      .setColor(0x00d26a)
      .setTitle(`${target.user.tag}'s Balance`)
      .addFields(
        { name: 'Wallet', value: `${symbol}${data.balance.toLocaleString()}`, inline: true },
        { name: 'Bank', value: `${symbol}${data.bank.toLocaleString()}`, inline: true },
        { name: 'Net Worth', value: `${symbol}${(data.balance + data.bank).toLocaleString()}`, inline: true },
      )
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};
