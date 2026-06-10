const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Remove a role from a member')
    .addUserOption(opt => opt.setName('user').setDescription('The user to remove the role from').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('The role to remove').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Error', 'Could not find that user.')], ephemeral: true });
    if (!target.roles.cache.has(role.id)) return interaction.reply({ embeds: [errorEmbed('Error', `${target.user.tag} doesn't have that role.`)], ephemeral: true });

    const botRole = interaction.guild.members.me.roles.highest;
    if (botRole.position <= role.position) {
      return interaction.reply({ embeds: [errorEmbed('Error', 'My role is not high enough to remove this role.')], ephemeral: true });
    }

    await target.roles.remove(role);
    interaction.reply({ embeds: [successEmbed('Role Removed', `Removed **${role.name}** from **${target.user.tag}**.`)] });
  }
};
