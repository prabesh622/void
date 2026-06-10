const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder } = require('discord.js');
const { errorEmbed, infoEmbed, successEmbed } = require('../utils/embeds');
const GuildSettings = require('../schemas/GuildSettings');
const Ticket = require('../schemas/Ticket');
const Giveaway = require('../schemas/Giveaway');
const ReactionRole = require('../schemas/ReactionRole');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // === SLASH COMMANDS ===
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return interaction.reply({ embeds: [errorEmbed('Error', 'Unknown command.')], ephemeral: true });
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[CMD ERROR] ${interaction.commandName}:`, err);
        const reply = { embeds: [errorEmbed('Error', 'Something went wrong.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(reply).catch(() => {});
        else await interaction.reply(reply).catch(() => {});
      }
    }

    // === BUTTONS ===
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Ticket create button
      if (id === 'ticket_create') {
        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        if (!settings?.tickets?.enabled) return interaction.reply({ embeds: [errorEmbed('Error', 'Tickets not enabled.')], ephemeral: true });

        const existing = await Ticket.findOne({ guildId: interaction.guild.id, userId: interaction.user.id, status: { $in: ['open', 'reopened'] } });
        if (existing) return interaction.reply({ embeds: [errorEmbed('Error', `You already have a ticket: <#${existing.channelId}>`)], ephemeral: true });

        const ticketNum = settings.tickets.nextTicketId || 1;
        await GuildSettings.updateOne({ guildId: interaction.guild.id }, { $inc: { 'tickets.nextTicketId': 1 } });

        const overwrites = [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
          { id: client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'ManageChannels'] },
        ];
        if (settings.tickets.staffRoleId) overwrites.push({ id: settings.tickets.staffRoleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] });

        const channel = await interaction.guild.channels.create({
          name: `ticket-${ticketNum}-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: settings.tickets.categoryId || undefined,
          permissionOverwrites: overwrites,
        });

        await Ticket.create({ guildId: interaction.guild.id, ticketId: ticketNum, channelId: channel.id, userId: interaction.user.id, status: 'open' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
          new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('🙋'),
        );

        const content = settings.tickets.staffRoleId ? `<@&${settings.tickets.staffRoleId}>` : '';
        await channel.send({
          content,
          embeds: [new EmbedBuilder().setColor(0x3b82f6).setTitle(`Ticket #${ticketNum}`).setDescription(`Welcome <@${interaction.user.id}>!\nDescribe your issue and staff will be with you shortly.`).setTimestamp()],
          components: [row],
        });

        interaction.reply({ embeds: [successEmbed('Ticket Created', `Your ticket: <#${channel.id}>`)], ephemeral: true });
      }

      // Ticket close button
      if (id === 'ticket_close') {
        const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
        if (!ticket || ticket.status === 'closed') return interaction.reply({ embeds: [errorEmbed('Error', 'Ticket already closed.')], ephemeral: true });
        ticket.status = 'closed';
        ticket.closedAt = Date.now();
        await ticket.save();
        await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false, AddReactions: false });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
          new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setStyle(ButtonStyle.Secondary).setEmoji('🔓'),
          new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
        );
        interaction.reply({ embeds: [infoEmbed('Ticket Closed', 'This ticket has been closed.')], components: [row] });
      }

      // Ticket delete
      if (id === 'ticket_delete') {
        await interaction.reply({ embeds: [infoEmbed('Deleting', 'Deleting in 5 seconds...')] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      }

      // Ticket reopen
      if (id === 'ticket_reopen') {
        const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
        if (ticket) {
          ticket.status = 'reopened';
          await ticket.save();
          await interaction.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: true, AddReactions: true });
        }
        interaction.reply({ embeds: [infoEmbed('Reopened', 'Ticket has been reopened.')] });
      }

      // Ticket claim
      if (id === 'ticket_claim') {
        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        if (settings?.tickets?.staffRoleId && !interaction.member.roles.cache.has(settings.tickets.staffRoleId)) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'Only staff can claim tickets.')], ephemeral: true });
        }
        const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
        if (ticket) { ticket.claimedBy = interaction.user.id; await ticket.save(); }
        interaction.reply({ embeds: [infoEmbed('Claimed', `Ticket claimed by **${interaction.user.tag}**.`)] });
      }

      // Ticket transcript
      if (id === 'ticket_transcript') {
        await interaction.deferReply({ ephemeral: true });
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const sorted = [...messages.values()].reverse();
        const transcript = sorted.map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`).join('\n');
        const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
        if (ticket) { ticket.transcript = transcript; await ticket.save(); }

        const embed = new EmbedBuilder().setColor(0x3b82f6).setTitle('Ticket Transcript')
          .setDescription(`**Ticket:** #${ticket?.ticketId || '?'}\n**User:** <@${ticket?.userId || '?'}>\n\n\`\`\`\n${transcript.slice(0, 3800)}\n\`\`\``).setTimestamp();

        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        if (settings?.tickets?.transcriptChannelId) {
          const ch = interaction.guild.channels.cache.get(settings.tickets.transcriptChannelId);
          if (ch) await ch.send({ embeds: [embed] });
        }
        // DM transcript to user
        try { await interaction.user.send({ embeds: [embed] }); } catch {}
        interaction.editReply({ embeds: [successEmbed('Transcript', 'Generated and sent.')] });
      }

      // Giveaway enter
      if (id === 'giveaway_enter') {
        const gw = await Giveaway.findOne({ messageId: interaction.message.id });
        if (!gw) return interaction.reply({ embeds: [errorEmbed('Error', 'Giveaway not found.')], ephemeral: true });
        if (gw.status !== 'running') return interaction.reply({ embeds: [errorEmbed('Error', 'This giveaway has ended.')], ephemeral: true });
        if (gw.hostId === interaction.user.id) return interaction.reply({ embeds: [errorEmbed('Error', 'You cannot enter your own giveaway.')], ephemeral: true });

        if (gw.entries.includes(interaction.user.id)) {
          gw.entries = gw.entries.filter(e => e !== interaction.user.id);
          await gw.save();
          interaction.reply({ embeds: [infoEmbed('Giveaway', 'Entry removed.')], ephemeral: true });
        } else {
          // Check requirements
          if (gw.requirements?.roleId) {
            if (!interaction.member.roles.cache.has(gw.requirements.roleId)) {
              return interaction.reply({ embeds: [errorEmbed('Error', 'You don\'t have the required role.')], ephemeral: true });
            }
          }
          gw.entries.push(interaction.user.id);
          await gw.save();
          interaction.reply({ embeds: [successEmbed('Giveaway', `Entered! (${gw.entries.length} entries)`)], ephemeral: true });
        }
      }

      // RPS buttons
      if (id.startsWith('rps_')) {
        const userChoice = id.replace('rps_', '');
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * 3)];
        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
        let result;
        if (userChoice === botChoice) result = "It's a tie!";
        else if ((userChoice === 'rock' && botChoice === 'scissors') || (userChoice === 'paper' && botChoice === 'rock') || (userChoice === 'scissors' && botChoice === 'paper')) result = 'You win!';
        else result = 'You lose!';
        const color = result.includes('win') ? 0x00d26a : result.includes('lose') ? 0xff4757 : 0xffa502;
        interaction.update({ content: null, embeds: [new EmbedBuilder().setColor(color).setTitle('Rock Paper Scissors').setDescription(`You: ${emojis[userChoice]} **${userChoice}**\nBot: ${emojis[botChoice]} **${botChoice}**\n\n**${result}**`).setTimestamp()], components: [] });
      }

      // Verification button
      if (id === 'verify_button') {
        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        if (!settings?.verification?.verifiedRole) return interaction.reply({ embeds: [errorEmbed('Error', 'Verification not configured.')], ephemeral: true });

        // Account age check
        if (settings.verification.minAccountAge > 0) {
          const accountAge = (Date.now() - interaction.user.createdTimestamp) / 86400000;
          if (accountAge < settings.verification.minAccountAge) {
            return interaction.reply({ embeds: [errorEmbed('Error', `Your account must be at least ${settings.verification.minAccountAge} days old.`)], ephemeral: true });
          }
        }

        const role = interaction.guild.roles.cache.get(settings.verification.verifiedRole);
        if (!role) return interaction.reply({ embeds: [errorEmbed('Error', 'Verified role not found.')], ephemeral: true });
        await interaction.member.roles.add(role);
        interaction.reply({ embeds: [successEmbed('Verified', `You have been verified and received **${role.name}**.`)], ephemeral: true });
      }

      // Poll buttons
      if (id.startsWith('poll_')) {
        const parts = id.split('_');
        const pollId = parts[1];
        const optionIndex = parseInt(parts[2]);
        client.polls = client.polls || new Map();
        const poll = client.polls.get(pollId);
        if (!poll) return interaction.reply({ embeds: [errorEmbed('Error', 'This poll has expired.')], ephemeral: true });
        const prev = poll.votes.get(interaction.user.id);
        if (prev !== undefined) poll.results[prev]--;
        poll.votes.set(interaction.user.id, optionIndex);
        poll.results[optionIndex]++;
        const numbers = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
        const desc = poll.options.map((o, i) => `${numbers[i]} **${o}** — ${poll.results[i]} vote(s)`).join('\n');
        interaction.update({ embeds: [new EmbedBuilder().setColor(0x3b82f6).setTitle(`📊 ${poll.question}`).setDescription(desc).setTimestamp()] }).catch(() => {});
      }

      // === BOSS BATTLE BUTTONS ===
      if (id.startsWith('boss_attack_') || id.startsWith('boss_defend_') || id.startsWith('boss_power_')) {
        const channelId = id.split('_').slice(2).join('_');
        client.bossBattles = client.bossBattles || new Map();
        const boss = client.bossBattles.get(channelId);
        if (!boss) return interaction.reply({ embeds: [errorEmbed('Error', 'This battle has ended.')], ephemeral: true });

        const action = id.split('_')[1]; // attack, defend, power
        const userId = interaction.user.id;
        const attackName = require('../commands/fun/bossbattle').ATTACK_NAMES;

        if (!boss.attackers.has(userId)) {
          boss.attackers.set(userId, { name: interaction.user.tag, damage: 0, hits: 0 });
        }
        const attacker = boss.attackers.get(userId);

        let dmg = 0;
        let msg = '';
        const verb = attackName[Math.floor(Math.random() * attackName.length)];

        if (action === 'attack') {
          dmg = Math.floor(Math.random() * 26) + 15; // 15-40 base damage
          attacker.damage += dmg;
          attacker.hits++;
          msg = `⚔️ **${interaction.user.tag}** ${verb} the ${boss.name} for **${dmg}** damage!`;
        } else if (action === 'defend') {
          // Defending reduces boss's next attack damage (store as a flag)
          boss.defended = (boss.defended || 0) + 1;
          msg = `🛡️ **${interaction.user.tag}** takes a defensive stance! (Boss damage reduced next hit)`;
        } else if (action === 'power') {
          if (Math.random() < 0.3) {
            dmg = Math.floor(Math.random() * 51) + 40; // 40-90 power strike
            attacker.damage += dmg;
            attacker.hits++;
            msg = `💥 **${interaction.user.tag}** lands a POWERFUL strike for **${dmg}** damage!`;
          } else {
            msg = `💥 **${interaction.user.tag}**'s power strike **MISSED**!`;
          }
        }

        boss.hp = Math.max(0, boss.hp - dmg);

        // Boss counter-attacks if still alive
        let bossMsg = '';
        if (boss.hp > 0 && dmg > 0) {
          let bossDmg = Math.floor(Math.random() * (boss.attack[1] - boss.attack[0] + 1)) + boss.attack[0];
          if (boss.defended > 0) {
            bossDmg = Math.floor(bossDmg * 0.4);
            boss.defended = 0;
            bossMsg = `\n${boss.emoji} **${boss.name}** retaliates but the defense holds! Only **${bossDmg}** damage dealt to the void.`;
          } else {
            bossMsg = `\n${boss.emoji} **${boss.name}** strikes back for **${bossDmg}** damage!`;
          }
        }

        if (boss.hp <= 0) {
          // Boss defeated!
          const { buildHpBar } = require('../commands/fun/bossbattle');
          const hpBar = buildHpBar(0, boss.maxHp);

          // Calculate MVP (most damage)
          let mvp = null;
          let maxDmg = 0;
          for (const [uid, data] of boss.attackers) {
            if (data.damage > maxDmg) { maxDmg = data.damage; mvp = { id: uid, ...data }; }
          }

          const reward = Math.floor(Math.random() * (boss.reward[1] - boss.reward[0] + 1)) + boss.reward[0];
          const duration = Math.floor((Date.now() - boss.startedAt) / 1000);

          const fields = [
            { name: 'MVP (Most Damage)', value: mvp ? `<@${mvp.id}> — **${mvp.damage}** damage in ${mvp.hits} hits` : 'Nobody', inline: false },
            { name: 'Total Fighters', value: `${boss.attackers.size}`, inline: true },
            { name: 'Duration', value: `${duration}s`, inline: true },
            { name: 'Reward', value: `💰 ${reward} gold`, inline: true },
          ];

          // Add top 5 damage dealers
          const sorted = [...boss.attackers.entries()].sort((a, b) => b[1].damage - a[1].damage).slice(0, 5);
          if (sorted.length > 1) {
            fields.push({ name: 'Damage Leaderboard', value: sorted.map((s, i) => `${['🥇','🥈','🥉','4️⃣','5️⃣'][i]} <@${s[0]}> — **${s[1].damage}** dmg`).join('\n'), inline: false });
          }

          const deathEmbed = new EmbedBuilder()
            .setColor(0x00d26a)
            .setTitle(`🏆 ${boss.name} has been defeated!`)
            .setDescription(`${hpBar}\n**HP:** 0 / ${boss.maxHp}\n\n${msg}${bossMsg}\n\n**The ${boss.name} crumbles!**`)
            .addFields(fields)
            .setTimestamp();

          client.bossBattles.delete(channelId);
          interaction.update({ embeds: [deathEmbed], components: [] }).catch(() => {});
          return;
        }

        // Update battle embed
        const { buildHpBar } = require('../commands/fun/bossbattle');
        const hpBar = buildHpBar(boss.hp, boss.maxHp);
        const diffColors = { easy: 0x00d26a, medium: 0xffa502, hard: 0xff4757, legendary: 0x9b59b6, mythic: 0xff0055 };

        const updatedEmbed = new EmbedBuilder()
          .setColor(diffColors[boss.difficulty])
          .setTitle(`${boss.emoji} ${boss.name}`)
          .setDescription(`${hpBar}\n**HP:** ${boss.hp} / ${boss.maxHp}\n\n${msg}${bossMsg}\n\n⚔️ **Attack** | 🛡️ **Defend** | 💥 **Power Strike**`)
          .setFooter({ text: `Fighters: ${boss.attackers.size} | Boss HP: ${boss.hp}` })
          .setTimestamp();

        interaction.update({ embeds: [updatedEmbed] }).catch(() => {});
      }

      // === TEAM VOTE BUTTONS ===
      if (id.startsWith('teamvote_')) {
        const parts = id.split('_');
        const voteId = parts[1];
        const teamIndex = parseInt(parts[2]);
        client.teamVotes = client.teamVotes || new Map();
        const vote = client.teamVotes.get(voteId);
        if (!vote) return interaction.reply({ embeds: [errorEmbed('Error', 'This team vote has expired.')], ephemeral: true });

        const TEAM_EMOJIS = ['🔵', '🔴', '🟢', '🟡', '🟣', '🩷', '🩵', '🟠'];

        // Remove previous vote if any
        const prev = vote.votes.get(interaction.user.id);
        if (prev !== undefined) vote.results[prev]--;

        vote.votes.set(interaction.user.id, teamIndex);
        vote.results[teamIndex]++;

        const desc = vote.teams.map((t, i) =>
          `${TEAM_EMOJIS[i]} **Team ${t}** — ${vote.results[i]} vote(s)`
        ).join('\n\n');

        const embed = new EmbedBuilder()
          .setColor(0x6c5ce7)
          .setTitle(`🗳️ ${vote.title}`)
          .setDescription(`${desc}\n\n*Click a button below to vote for your team!*`)
          .setFooter({ text: `Created by ${interaction.message.interaction?.user?.tag || 'Unknown'}` })
          .setTimestamp();

        interaction.update({ embeds: [embed] }).catch(() => {});
        interaction.followUp({ content: `You voted for **Team ${vote.teams[teamIndex]}**!`, ephemeral: true }).catch(() => {});
      }

      // Reaction role buttons
      if (id.startsWith('rr_')) {
        const roleId = id.replace('rr_', '');
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ embeds: [errorEmbed('Error', 'Role not found.')], ephemeral: true });
        if (interaction.member.roles.cache.has(roleId)) {
          await interaction.member.roles.remove(role);
          interaction.reply({ embeds: [infoEmbed('Role Removed', `Removed **${role.name}**.`)], ephemeral: true });
        } else {
          await interaction.member.roles.add(role);
          interaction.reply({ embeds: [successEmbed('Role Added', `Added **${role.name}**.`)], ephemeral: true });
        }
      }

      // === OWNER PANEL BUTTONS ===
      if (id.startsWith('owner_')) {
        const { isOwner, isAdmin, adminList, OWNER_ID } = require('../commands/admin/owner');
        if (!isOwner(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Access Denied', 'Owner only.')], ephemeral: true });
        const guildId = interaction.guild.id;

        if (id === 'owner_servers') {
          const list = client.guilds.cache.map(g => `**${g.name}** — ${g.memberCount} members (ID: ${g.id})`).join('\n');
          interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0055).setTitle('📋 Server List').setDescription(list || 'No servers').setTimestamp()], ephemeral: true });
        }

        if (id === 'owner_addadmin') {
          // Ask owner to mention a user
          interaction.reply({ embeds: [infoEmbed('Add Admin', 'Mention the user you want to add as admin in your next message.\nType `cancel` to cancel.')], ephemeral: true });
          const filter = m => m.author.id === interaction.user.id;
          const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30000 });
          collector.on('collect', async m => {
            if (m.content.toLowerCase() === 'cancel') { m.reply('Cancelled.'); return; }
            const match = m.content.match(/<@!?(\d+)>/) || m.content.match(/^(\d+)$/);
            if (!match) { m.reply('Invalid user. Use a mention or user ID.'); return; }
            const targetId = match[1];
            if (!adminList.has(guildId)) adminList.set(guildId, new Set());
            adminList.get(guildId).add(targetId);
            m.reply({ embeds: [successEmbed('Admin Added', `<@${targetId}> is now an admin for this server.`)] });
          });
          collector.on('end', (_, reason) => { if (reason === 'time') interaction.followUp({ content: 'Timed out.', ephemeral: true }); });
        }

        if (id === 'owner_deladmin') {
          const admins = adminList.get(guildId);
          if (!admins || admins.size === 0) return interaction.reply({ embeds: [infoEmbed('No Admins', 'No admins to remove.')], ephemeral: true });
          interaction.reply({ embeds: [infoEmbed('Remove Admin', 'Mention the admin you want to remove.\nType `cancel` to cancel.')], ephemeral: true });
          const filter = m => m.author.id === interaction.user.id;
          const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30000 });
          collector.on('collect', async m => {
            if (m.content.toLowerCase() === 'cancel') { m.reply('Cancelled.'); return; }
            const match = m.content.match(/<@!?(\d+)>/) || m.content.match(/^(\d+)$/);
            if (!match) { m.reply('Invalid user.'); return; }
            const targetId = match[1];
            admins.delete(targetId);
            m.reply({ embeds: [successEmbed('Admin Removed', `<@${targetId}> is no longer an admin.`)] });
          });
          collector.on('end', (_, reason) => { if (reason === 'time') interaction.followUp({ content: 'Timed out.', ephemeral: true }); });
        }

        if (id === 'owner_shutdown') {
          interaction.reply({ embeds: [infoEmbed('Shutdown', 'Shutting down in 3 seconds...')] });
          setTimeout(() => { client.destroy(); process.exit(0); }, 3000);
        }

        if (id === 'owner_refresh') {
          const g = client.guilds.cache;
          const totalM = g.reduce((s, guild) => s + guild.memberCount, 0);
          interaction.update({ embeds: [new EmbedBuilder().setColor(0xff0055).setTitle('👑 Owner Panel (Refreshed)').setDescription(`Servers: **${g.size}** | Members: **${totalM}** | Ping: **${client.ws.ping}ms** | Commands: **${client.commands.size}**`).setTimestamp()], components: interaction.message.components }).catch(() => {});
        }

        if (id === 'owner_resetsettings') {
          await GuildSettings.deleteOne({ guildId });
          interaction.reply({ embeds: [successEmbed('Settings Reset', 'Server settings have been reset to defaults.')] });
        }

        if (id === 'owner_broadcast') {
          interaction.reply({ embeds: [infoEmbed('Broadcast', 'Type the message to broadcast to all servers.\nType `cancel` to cancel.')], ephemeral: true });
          const filter = m => m.author.id === interaction.user.id;
          const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });
          collector.on('collect', async m => {
            if (m.content.toLowerCase() === 'cancel') { m.reply('Cancelled.'); return; }
            const embed = new EmbedBuilder().setColor(0xff0055).setTitle('📢 Bot Owner Broadcast').setDescription(m.content).setFooter({ text: `From: ${interaction.user.tag}` }).setTimestamp();
            let sent = 0;
            for (const [, guild] of client.guilds.cache) {
              const ch = guild.systemChannel || guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(client.user)?.has('SendMessages'));
              if (ch) { await ch.send({ embeds: [embed] }).catch(() => {}); sent++; }
            }
            m.reply({ embeds: [successEmbed('Broadcast Sent', `Message sent to **${sent}** servers.`)] });
          });
          collector.on('end', (_, reason) => { if (reason === 'time') interaction.followUp({ content: 'Timed out.', ephemeral: true }); });
        }

        if (id === 'owner_userinfo') {
          interaction.reply({ embeds: [infoEmbed('User Lookup', 'Mention a user or paste their ID.\nType `cancel` to cancel.')], ephemeral: true });
          const filter = m => m.author.id === interaction.user.id;
          const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30000 });
          collector.on('collect', async m => {
            if (m.content.toLowerCase() === 'cancel') { m.reply('Cancelled.'); return; }
            const match = m.content.match(/<@!?(\d+)>/) || m.content.match(/^(\d+)$/);
            if (!match) { m.reply('Invalid user.'); return; }
            try {
              const user = await client.users.fetch(match[1]);
              const mutualGuilds = client.guilds.cache.filter(g => g.members.cache.has(user.id));
              m.reply({ embeds: [new EmbedBuilder().setColor(0xff0055).setTitle('🔍 User Info').setThumbnail(user.displayAvatarURL()).addFields({ name: 'Tag', value: user.tag, inline: true }, { name: 'ID', value: user.id, inline: true }, { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }, { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true }, { name: 'Mutual Servers', value: `${mutualGuilds.size}`, inline: true })] });
            } catch { m.reply('Could not find that user.'); }
          });
          collector.on('end', (_, reason) => { if (reason === 'time') interaction.followUp({ content: 'Timed out.', ephemeral: true }); });
        }

        if (id === 'owner_stats') {
          const memUsage = process.memoryUsage();
          const heap = Math.round(memUsage.heapUsed / 1024 / 1024);
          const total = Math.round(memUsage.heapTotal / 1024 / 1024);
          const rss = Math.round(memUsage.rss / 1024 / 1024);
          interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0055).setTitle('📈 Full Bot Stats').addFields({ name: 'Memory', value: `Heap: ${heap}/${total} MB\nRSS: ${rss} MB`, inline: true }, { name: 'Node.js', value: process.version, inline: true }, { name: 'Discord.js', value: require('discord.js').version, inline: true }, { name: 'Guilds', value: `${client.guilds.cache.size}`, inline: true }, { name: 'Commands', value: `${client.commands.size}`, inline: true }, { name: 'Ping', value: `${client.ws.ping}ms`, inline: true }).setTimestamp()], ephemeral: true });
        }
      }

      // === ADMIN PANEL BUTTONS ===
      if (id.startsWith('admin_')) {
        const { isOwner, isAdmin } = require('../commands/admin/owner');
        if (!isOwner(interaction.user.id) && !isAdmin(interaction.guild.id, interaction.user.id)) {
          return interaction.reply({ embeds: [errorEmbed('Access Denied', 'Admin access required.')], ephemeral: true });
        }
        const guildId = interaction.guild.id;

        const toggleMap = {
          admin_togglemod: ['moderation.enabled', 'Moderation'],
          admin_toggleautomod: ['automod.enabled', 'AutoMod'],
          admin_togglewelcome: ['welcome.enabled', 'Welcome'],
          admin_toggleleveling: ['leveling.enabled', 'Leveling'],
          admin_toggleeconomy: ['economy.enabled', 'Economy'],
          admin_toggletickets: ['tickets.enabled', 'Tickets'],
          admin_toggleai: ['ai.enabled', 'AI Chat'],
          admin_togglesecurity: ['security.enabled', 'Security'],
        };

        if (toggleMap[id]) {
          const [path, name] = toggleMap[id];
          const settings = await GuildSettings.findOne({ guildId }).catch(() => null);
          if (!settings) { await GuildSettings.create({ guildId }); }
          const parts = path.split('.');
          const current = settings?.[parts[0]]?.[parts[1]];
          await GuildSettings.updateOne({ guildId }, { [path]: !current });
          interaction.reply({ embeds: [successEmbed(name, `${name} has been **${!current ? 'enabled' : 'disabled'}**.`)], ephemeral: true });
        }

        if (id === 'admin_refresh') {
          const settings = await GuildSettings.findOne({ guildId }).catch(() => null);
          const mod = settings ? [
            `Moderation: ${settings.moderation?.enabled ? '✅' : '❌'}`,
            `AutoMod: ${settings.automod?.enabled ? '✅' : '❌'}`,
            `Welcome: ${settings.welcome?.enabled ? '✅' : '❌'}`,
            `Leveling: ${settings.leveling?.enabled ? '✅' : '❌'}`,
            `Economy: ${settings.economy?.enabled ? '✅' : '❌'}`,
            `Tickets: ${settings.tickets?.enabled ? '✅' : '❌'}`,
            `AI Chat: ${settings.ai?.enabled ? '✅' : '❌'}`,
            `Security: ${settings.security?.enabled ? '✅' : '❌'}`,
          ].join('\n') : 'Settings not initialized';
          interaction.update({ embeds: [new EmbedBuilder().setColor(0x3b82f6).setTitle('🛡️ Admin Panel (Refreshed)').setDescription(`**Server:** ${interaction.guild.name}\nMembers: **${interaction.guild.memberCount}** | Channels: **${interaction.guild.channels.cache.size}** | Emojis: **${interaction.guild.emojis.cache.size}**`).addFields({ name: '🔧 Modules', value: mod })] }).catch(() => {});
        }

        if (id === 'admin_emojis') {
          const emojis = interaction.guild.emojis.cache;
          if (emojis.size === 0) return interaction.reply({ embeds: [infoEmbed('Emojis', 'No custom emojis in this server.')], ephemeral: true });
          const animated = emojis.filter(e => e.animated);
          const normal = emojis.filter(e => !e.animated);
          const normalList = normal.first(20).map(e => `${e}`).join(' ') || 'None';
          const animList = animated.first(20).map(e => `${e}`).join(' ') || 'None';
          interaction.reply({
            embeds: [new EmbedBuilder().setColor(0x3b82f6).setTitle('😀 Server Emojis').addFields(
              { name: `Static (${normal.size})`, value: normalList + (normal.size > 20 ? ` ...and ${normal.size - 20} more` : ''), inline: false },
              { name: `Animated (${animated.size})`, value: animList + (animated.size > 20 ? ` ...and ${animated.size - 20} more` : ''), inline: false },
              { name: 'Total', value: `${emojis.size} emojis`, inline: true },
            ).setTimestamp()], ephemeral: true
          });
        }

        if (id === 'admin_purgeall') {
          await interaction.deferReply({ ephemeral: true });
          try {
            const fetched = await interaction.channel.messages.fetch({ limit: 100 });
            const deleted = await interaction.channel.bulkDelete(fetched, true);
            interaction.editReply({ embeds: [successEmbed('Purge', `Deleted **${deleted.size}** messages.`)] });
          } catch (err) {
            interaction.editReply({ embeds: [errorEmbed('Error', `Failed: ${err.message}`)] });
          }
        }

        if (id === 'admin_serverstats') {
          const g = interaction.guild;
          const online = g.members.cache.filter(m => m.presence?.status === 'online').size;
          const bots = g.members.cache.filter(m => m.user.bot).size;
          const humans = g.memberCount - bots;
          interaction.reply({
            embeds: [new EmbedBuilder().setColor(0x3b82f6).setTitle('📊 Server Statistics').addFields(
              { name: 'Members', value: `Total: **${g.memberCount}**\nHumans: **${humans}**\nBots: **${bots}**`, inline: true },
              { name: 'Channels', value: `Text: **${g.channels.cache.filter(c => c.type === 0).size}**\nVoice: **${g.channels.cache.filter(c => c.type === 2).size}**\nCategories: **${g.channels.cache.filter(c => c.type === 4).size}**`, inline: true },
              { name: 'Other', value: `Roles: **${g.roles.cache.size}**\nEmojis: **${g.emojis.cache.size}**\nBoosts: **${g.premiumSubscriptionCount || 0}**`, inline: true },
            ).setTimestamp()], ephemeral: true
          });
        }

        if (id === 'admin_rolelist') {
          const roles = interaction.guild.roles.cache.sort((a, b) => b.position - a.position);
          const top = roles.first(25).map(r => `${r} (${r.members.size} members)`).join('\n');
          interaction.reply({
            embeds: [new EmbedBuilder().setColor(0x3b82f6).setTitle('📋 Role List').setDescription(`${top}\n\n**Total:** ${roles.size} roles`).setTimestamp()], ephemeral: true
          });
        }
      }

      // === TRIVIA BUTTONS ===
      if (id.startsWith('trivia_')) {
        // Trivia buttons are handled by their own collector in trivia.js
        // This is a fallback in case the collector misses them
        return;
      }

      // === COUNTDOWN CANCEL ===
      if (id.startsWith('countdown_cancel_')) {
        const channelId = id.replace('countdown_cancel_', '');
        client.countdowns = client.countdowns || new Map();
        const cd = client.countdowns.get(channelId);
        if (!cd) return interaction.reply({ embeds: [errorEmbed('Error', 'This countdown has already ended.')], ephemeral: true });
        if (interaction.user.id !== cd.startedBy && !interaction.member.permissions.has('ManageChannels')) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'Only the countdown creator or a moderator can cancel.')], ephemeral: true });
        }
        clearInterval(cd.interval);
        client.countdowns.delete(channelId);
        interaction.update({ embeds: [new EmbedBuilder().setColor(0xff4757).setTitle('⏰ Countdown Cancelled').setDescription(`The **${cd.label}** countdown has been cancelled by **${interaction.user.tag}**.`).setTimestamp()], components: [] }).catch(() => {});
      }
    }

    // === SELECT MENUS ===
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('rr_select_')) {
        const rrDoc = await ReactionRole.findOne({ messageId: interaction.message.id });
        if (!rrDoc) return interaction.reply({ embeds: [errorEmbed('Error', 'Reaction role not found.')], ephemeral: true });
        const selectedRoles = interaction.values;
        for (const roleId of selectedRoles) {
          const role = interaction.guild.roles.cache.get(roleId);
          if (role && !interaction.member.roles.cache.has(roleId)) {
            await interaction.member.roles.add(role).catch(() => {});
          }
        }
        interaction.reply({ embeds: [successEmbed('Roles Updated', `You received ${selectedRoles.length} role(s).`)], ephemeral: true });
      }

      // Ticket category select
      if (interaction.customId === 'ticket_category') {
        const category = interaction.values[0];
        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        if (!settings?.tickets?.enabled) return interaction.reply({ embeds: [errorEmbed('Error', 'Tickets not enabled.')], ephemeral: true });

        const existing = await Ticket.findOne({ guildId: interaction.guild.id, userId: interaction.user.id, status: { $in: ['open', 'reopened'] } });
        if (existing) return interaction.reply({ embeds: [errorEmbed('Error', `You already have a ticket: <#${existing.channelId}>`)], ephemeral: true });

        const ticketNum = settings.tickets.nextTicketId || 1;
        await GuildSettings.updateOne({ guildId: interaction.guild.id }, { $inc: { 'tickets.nextTicketId': 1 } });

        const overwrites = [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
          { id: client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'ManageChannels'] },
        ];
        if (settings.tickets.staffRoleId) overwrites.push({ id: settings.tickets.staffRoleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] });

        const channel = await interaction.guild.channels.create({
          name: `ticket-${ticketNum}-${category}`,
          type: ChannelType.GuildText,
          parent: settings.tickets.categoryId || undefined,
          permissionOverwrites: overwrites,
        });
        await Ticket.create({ guildId: interaction.guild.id, ticketId: ticketNum, channelId: channel.id, userId: interaction.user.id, category, status: 'open' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
          new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('🙋'),
        );
        const content = settings.tickets.staffRoleId ? `<@&${settings.tickets.staffRoleId}>` : '';
        await channel.send({ content, embeds: [new EmbedBuilder().setColor(0x3b82f6).setTitle(`Ticket #${ticketNum} - ${category}`).setDescription(`Welcome <@${interaction.user.id}>!`).setTimestamp()], components: [row] });
        interaction.reply({ embeds: [successEmbed('Ticket Created', `Your ticket: <#${channel.id}>`)], ephemeral: true });
      }
    }
  }
};
