const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');
const AFK = require('../../schemas/AFK');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set your AFK status')
    .addStringOption(opt => opt.setName('reason').setDescription('AFK reason').setRequired(false)),

  async execute(interaction) {
    const reason = interaction.options.getString('reason') || 'AFK';

    await AFK.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: interaction.user.id },
      { reason, since: Date.now() },
      { upsert: true }
    );

    interaction.reply({ embeds: [infoEmbed('AFK Set', `**${interaction.user.tag}** is now AFK: ${reason}\nI'll let people know when they mention you.`)] });
  }
};
