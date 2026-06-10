const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const ReactionRole = require('../../schemas/ReactionRole');
const GuildSettings = require('../../schemas/GuildSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rr')
    .setDescription('Manage reaction roles')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a reaction role panel')
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send the panel').setRequired(true))
      .addStringOption(opt => opt.setName('title').setDescription('Panel title').setRequired(true))
      .addStringOption(opt => opt.setName('type').setDescription('Button or Select Menu').setRequired(true)
        .addChoices({ name: 'Buttons', value: 'button' }, { name: 'Select Menu', value: 'select' }))
      .addRoleOption(opt => opt.setName('role1').setDescription('First role').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Panel description').setRequired(false))
      .addRoleOption(opt => opt.setName('role2').setDescription('Second role').setRequired(false))
      .addRoleOption(opt => opt.setName('role3').setDescription('Third role').setRequired(false))
      .addRoleOption(opt => opt.setName('role4').setDescription('Fourth role').setRequired(false))
      .addRoleOption(opt => opt.setName('role5').setDescription('Fifth role').setRequired(false))
    )
    .addSubcommand(sub => sub.setName('delete').setDescription('Delete a reaction role panel').addStringOption(opt => opt.setName('message_id').setDescription('Message ID of the panel').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List all reaction role panels'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'create') {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description') || 'Click a button to get a role!';
      const type = interaction.options.getString('type');

      const roles = [];
      for (let i = 1; i <= 5; i++) {
        const role = interaction.options.getRole(`role${i}`);
        if (role) roles.push(role);
      }

      const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: interaction.guild.name })
        .setTimestamp();

      const components = [];

      if (type === 'button') {
        const row = new ActionRowBuilder();
        roles.forEach(role => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`rr_${role.id}`)
              .setLabel(role.name)
              .setStyle(ButtonStyle.Primary)
          );
        });
        components.push(row);
      } else {
        const options = roles.map(r => ({ label: r.name, value: r.id, description: `Get the ${r.name} role` }));
        const select = new StringSelectMenuBuilder()
          .setCustomId(`rr_select_${interaction.id}`)
          .setPlaceholder('Select roles...')
          .setMinValues(0)
          .setMaxValues(roles.length)
          .addOptions(options);
        components.push(new ActionRowBuilder().addComponents(select));
      }

      const msg = await channel.send({ embeds: [embed], components });

      // Save to DB
      await ReactionRole.create({
        guildId,
        channelId: channel.id,
        messageId: msg.id,
        type,
        roles: roles.map(r => ({ roleId: r.id, label: r.name })),
      });

      await GuildSettings.updateOne({ guildId }, { 'reactionRoles.enabled': true }, { upsert: true });

      interaction.reply({ embeds: [successEmbed('Reaction Role', `Panel created in <#${channel.id}> with ${roles.length} role(s).`)], ephemeral: true });
    }

    if (sub === 'delete') {
      const messageId = interaction.options.getString('message_id');
      const rr = await ReactionRole.findOneAndDelete({ messageId, guildId });
      if (!rr) return interaction.reply({ embeds: [errorEmbed('Error', 'Reaction role panel not found.')], ephemeral: true });

      try {
        const channel = interaction.guild.channels.cache.get(rr.channelId);
        if (channel) {
          const msg = await channel.messages.fetch(messageId);
          await msg.delete();
        }
      } catch {}

      interaction.reply({ embeds: [successEmbed('Reaction Role', 'Panel deleted.')] });
    }

    if (sub === 'list') {
      const panels = await ReactionRole.find({ guildId });
      if (panels.length === 0) return interaction.reply({ embeds: [infoEmbed('Reaction Roles', 'No reaction role panels configured.')] });

      const list = panels.map(p => `<#${p.channelId}> — ${p.type} — ${p.roles.length} role(s) — Msg: ${p.messageId}`).join('\n');
      interaction.reply({ embeds: [new EmbedBuilder().setColor(0x3b82f6).setTitle('Reaction Role Panels').setDescription(list).setTimestamp()] });
    }
  }
};
