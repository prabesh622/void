const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const Economy = require('../../schemas/Economy');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit money into your bank')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to deposit (0 = all)').setRequired(false).setMinValue(0)),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    let data = await Economy.findOne({ guildId, userId });
    if (!data) data = await Economy.create({ guildId, userId });

    const settings = await GuildSettings.findOne({ guildId });
    const symbol = settings?.economy?.currencySymbol || '$';

    let amount = interaction.options.getInteger('amount');
    if (amount === null || amount === 0) amount = data.balance;

    if (amount > data.balance) return interaction.reply({ embeds: [errorEmbed('Error', `You only have **${symbol}${data.balance}** in your wallet.`)], ephemeral: true });
    if (amount <= 0) return interaction.reply({ embeds: [errorEmbed('Error', 'Nothing to deposit.')], ephemeral: true });

    data.balance -= amount;
    data.bank += amount;
    await data.save();

    interaction.reply({ embeds: [successEmbed('Deposit', `Deposited **${symbol}${amount}** into your bank.\n**Wallet:** ${symbol}${data.balance} | **Bank:** ${symbol}${data.bank}`)] });
  }
};
