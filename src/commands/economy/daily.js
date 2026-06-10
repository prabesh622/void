const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const Economy = require('../../schemas/Economy');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    let data = await Economy.findOne({ guildId, userId });
    if (!data) data = await Economy.create({ guildId, userId });

    const settings = await GuildSettings.findOne({ guildId });
    const cooldown = settings?.economy?.dailyCooldown || 86400000;
    const min = settings?.economy?.dailyMin || 200;
    const max = settings?.economy?.dailyMax || 700;
    const symbol = settings?.economy?.currencySymbol || '$';
    const now = Date.now();

    if (now - data.lastDaily < cooldown) {
      const remaining = cooldown - (now - data.lastDaily);
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return interaction.reply({ embeds: [errorEmbed('Daily Reward', `You already claimed your daily. Come back in **${hours}h ${minutes}m**.`)], ephemeral: true });
    }

    const reward = Math.floor(Math.random() * (max - min + 1)) + min;
    data.balance += reward;
    data.lastDaily = now;
    data.totalEarned += reward;
    await data.save();

    interaction.reply({ embeds: [successEmbed('Daily Reward', `You claimed **${symbol}${reward}**! Come back tomorrow for more.`)] });
  }
};
