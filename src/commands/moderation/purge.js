const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../services/loggingService');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(opt => opt.setName('user').setDescription('Only delete messages from this user').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      let toDelete = messages;

      if (targetUser) {
        toDelete = messages.filter(m => m.author.id === targetUser.id);
      }

      const deleted = await interaction.channel.bulkDelete(toDelete, true);

      const desc = targetUser
        ? `Deleted **${deleted.size}** message(s) from **${targetUser.tag}**.`
        : `Deleted **${deleted.size}** message(s).`;

      await interaction.editReply({ embeds: [successEmbed('Purge Complete', desc)] });

      sendLog(interaction.client, interaction.guild.id, 'moderation', new EmbedBuilder().setColor(0xff0000).setTitle('Messages Purged').setDescription(desc + `\n**Channel:** <#${interaction.channel.id}>\n**Moderator:** ${interaction.user.tag}`).setTimestamp());

      setTimeout(async () => {
        await interaction.deleteReply().catch(() => {});
      }, 5000);
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed('Error', `Failed to purge messages: ${err.message}`)] });
    }
  }
};
