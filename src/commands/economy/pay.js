const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const Economy = require('../../schemas/Economy');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Send money to another member')
    .addUserOption(opt => opt.setName('user').setDescription('The user to pay').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to send').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guild.id;

    if (target.user.bot) return interaction.reply({ content: 'You can\'t pay bots.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('Error', 'You can\'t pay yourself.')], ephemeral: true });

    let sender = await Economy.findOne({ guildId, userId: interaction.user.id });
    if (!sender) sender = await Economy.create({ guildId, userId: interaction.user.id });

    let receiver = await Economy.findOne({ guildId, userId: target.id });
    if (!receiver) receiver = await Economy.create({ guildId, userId: target.id });

    const settings = await GuildSettings.findOne({ guildId });
    const symbol = settings?.economy?.currencySymbol || '$';

    if (sender.balance < amount) return interaction.reply({ embeds: [errorEmbed('Error', `You only have **${symbol}${sender.balance}** in your wallet.`)], ephemeral: true });

    sender.balance -= amount;
    sender.totalSpent += amount;
    await sender.save();

    receiver.balance += amount;
    receiver.totalEarned += amount;
    await receiver.save();

    interaction.reply({ embeds: [successEmbed('Payment Sent', `Sent **${symbol}${amount}** to **${target.user.tag}**.`)] });
  }
};
