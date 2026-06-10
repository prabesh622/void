const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const Economy = require('../../schemas/Economy');
const GuildSettings = require('../../schemas/GuildSettings');

const jobs = [
  { name: 'Developer', min: 80, max: 250 }, { name: 'Chef', min: 60, max: 180 },
  { name: 'Streamer', min: 50, max: 300 }, { name: 'Taxi Driver', min: 40, max: 150 },
  { name: 'Doctor', min: 100, max: 350 }, { name: 'Artist', min: 30, max: 200 },
  { name: 'Mechanic', min: 50, max: 160 }, { name: 'Teacher', min: 60, max: 140 },
  { name: 'Pilot', min: 120, max: 400 }, { name: 'Farmer', min: 40, max: 120 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn money'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    let data = await Economy.findOne({ guildId, userId });
    if (!data) data = await Economy.create({ guildId, userId });

    const settings = await GuildSettings.findOne({ guildId });
    const cooldown = settings?.economy?.workCooldown || 7200000;
    const symbol = settings?.economy?.currencySymbol || '$';
    const now = Date.now();

    if (now - data.lastWork < cooldown) {
      const remaining = cooldown - (now - data.lastWork);
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return interaction.reply({ embeds: [errorEmbed('Work', `You need to rest! Come back in **${hours}h ${minutes}m**.`)], ephemeral: true });
    }

    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const earnings = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

    data.balance += earnings;
    data.lastWork = now;
    data.totalEarned += earnings;
    await data.save();

    interaction.reply({ embeds: [successEmbed('Work', `You worked as a **${job.name}** and earned **${symbol}${earnings}**!`)] });
  }
};
