const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levelrewards')
    .setDescription('Manage level-up role rewards')
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a role reward for reaching a level')
      .addIntegerOption(opt => opt.setName('level').setDescription('The level to reward at').setRequired(true).setMinValue(1))
      .addRoleOption(opt => opt.setName('role').setDescription('The role to give').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a role reward')
      .addIntegerOption(opt => opt.setName('level').setDescription('The level to remove reward from').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List all level rewards'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let settings = await GuildSettings.findOne({ guildId });
    if (!settings) settings = await GuildSettings.create({ guildId });

    if (sub === 'add') {
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');

      const botRole = interaction.guild.members.me.roles.highest;
      if (botRole.position <= role.position) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'My role is not high enough to manage this role.')], ephemeral: true });
      }

      // Check if reward already exists for this level
      const existing = settings.leveling.rewards?.find(r => r.level === level);
      if (existing) {
        await GuildSettings.updateOne({ guildId }, { $pull: { 'leveling.rewards': { level } } });
      }

      await GuildSettings.updateOne({ guildId }, { $push: { 'leveling.rewards': { level, roleId: role.id } } });
      interaction.reply({ embeds: [successEmbed('Level Reward Added', `At level **${level}**, members will receive <@&${role.id}>.`)] });
    }

    if (sub === 'remove') {
      const level = interaction.options.getInteger('level');
      const result = await GuildSettings.updateOne({ guildId }, { $pull: { 'leveling.rewards': { level } } });
      if (result.modifiedCount === 0) return interaction.reply({ embeds: [errorEmbed('Error', 'No reward found for that level.')], ephemeral: true });
      interaction.reply({ embeds: [successEmbed('Level Reward Removed', `Removed the reward for level **${level}**.`)] });
    }

    if (sub === 'list') {
      const rewards = settings.leveling.rewards || [];
      if (rewards.length === 0) {
        return interaction.reply({ embeds: [infoEmbed('Level Rewards', 'No level rewards configured.')] });
      }

      const list = rewards.sort((a, b) => a.level - b.level).map(r => `Level **${r.level}** → <@&${r.roleId}>`).join('\n');
      interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x3b82f6).setTitle('Level Rewards').setDescription(list).setTimestamp()]
      });
    }
  }
};
