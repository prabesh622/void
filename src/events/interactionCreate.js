const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder } = require('discord.js');
const { errorEmbed, infoEmbed, successEmbed } = require('../utils/embeds');
const GuildSettings = require('../schemas/GuildSettings');
const Ticket = require('../schemas/Ticket');
const ReactionRole = require('../schemas/ReactionRole');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // === SLASH COMMANDS ===
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return interaction.reply({ embeds: [errorEmbed('Error', 'Unknown command.')], ephemeral: true });

      // ── Command Enable/Disable Check ──
      if (interaction.guild) {
        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id }).catch(() => null);
        if (settings) {
          const disabledCommands = settings.disabledCommands || [];
          const disabledCategories = settings.disabledCategories || [];

          // Check if specific command is disabled
          if (disabledCommands.includes(interaction.commandName)) {
            return interaction.reply({
              embeds: [errorEmbed('Command Disabled', `The command \`/${interaction.commandName}\` has been disabled on this server.`)],
              ephemeral: true,
            });
          }

          // Check if command category is disabled
          if (command.data?.category && disabledCategories.includes(command.data.category)) {
            return interaction.reply({
              embeds: [errorEmbed('Category Disabled', `The \`${command.data.category}\` category has been disabled on this server.`)],
              ephemeral: true,
            });
          }
        }
      }

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

        // === BLACKLIST USER ===
        if (id === 'owner_blacklist') {
          interaction.reply({ embeds: [infoEmbed('Blacklist User', 'Mention the user or paste their ID to blacklist.\nType `cancel` to cancel.')], ephemeral: true });
          const filter = m => m.author.id === interaction.user.id;
          const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30000 });
          collector.on('collect', async m => {
            if (m.content.toLowerCase() === 'cancel') { m.reply('Cancelled.'); return; }
            const match = m.content.match(/<@!?(\d+)>/) || m.content.match(/^(\d+)$/);
            if (!match) { m.reply('Invalid user. Use a mention or user ID.'); return; }
            const targetId = match[1];
            if (targetId === OWNER_ID) { m.reply('Cannot blacklist the owner!'); return; }
            const { blacklist } = require('../commands/admin/owner');
            blacklist.add(targetId);
            m.reply({ embeds: [successEmbed('Blacklisted', `User <@${targetId}> has been blacklisted from all bot features.`)] });
          });
        }

        // === UNBLACKLIST USER ===
        if (id === 'owner_unblacklist') {
          interaction.reply({ embeds: [infoEmbed('Unblacklist User', 'Mention the user or paste their ID to remove from blacklist.\nType `cancel` to cancel.')], ephemeral: true });
          const filter = m => m.author.id === interaction.user.id;
          const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30000 });
          collector.on('collect', async m => {
            if (m.content.toLowerCase() === 'cancel') { m.reply('Cancelled.'); return; }
            const match = m.content.match(/<@!?(\d+)>/) || m.content.match(/^(\d+)$/);
            if (!match) { m.reply('Invalid user.'); return; }
            const { blacklist } = require('../commands/admin/owner');
            blacklist.delete(match[1]);
            m.reply({ embeds: [successEmbed('Unblacklisted', `User <@${match[1]}> has been removed from blacklist.`)] });
          });
        }

        // === BYPASS TOGGLE ===
        if (id === 'owner_bypass') {
          const { bypassFlags } = require('../commands/admin/owner');
          const features = ['cooldown', 'automod', 'leveling', 'antispam', 'antilink'];
          if (!bypassFlags.has(guildId)) bypassFlags.set(guildId, new Set());
          const guildBypass = bypassFlags.get(guildId);
          const status = features.map(f => `${guildBypass.has(f) ? '✅' : '❌'} ${f}`).join('\n');
          
          const bypassRow = new ActionRowBuilder().addComponents(
            ...features.map(f => new ButtonBuilder()
              .setCustomId(`bypass_${f}`)
              .setLabel(f.charAt(0).toUpperCase() + f.slice(1))
              .setStyle(guildBypass.has(f) ? ButtonStyle.Success : ButtonStyle.Danger)
              .setEmoji(guildBypass.has(f) ? '✅' : '❌'))
          );
          
          interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xff0055).setTitle('⚡ Bypass Toggles').setDescription(`Toggle bypass features for this server:\n\n${status}`).setTimestamp()],
            components: [bypassRow],
            ephemeral: true,
          });
        }

        // === AI LOGS ===
        if (id === 'owner_ailogs') {
          const AILog = require('../schemas/AILog');
          const logs = await AILog.find({ guildId }).catch(() => []);
          if (!logs || logs.length === 0) {
            return interaction.reply({ embeds: [infoEmbed('AI Logs', 'No AI logs found for this server.')], ephemeral: true });
          }
          const recent = logs.slice(-10).reverse();
          const logText = recent.map((l, i) => {
            const user = l.userId ? `<@${l.userId}>` : 'Unknown';
            return `**${i + 1}.** ${user}: \`${(l.userMessage || '').slice(0, 50)}\`\n→ \`${(l.aiResponse || '').slice(0, 80)}\``;
          }).join('\n\n');
          interaction.reply({ embeds: [new EmbedBuilder().setColor(0x4285f4).setTitle('📝 Recent AI Logs').setDescription(logText.slice(0, 3900)).setFooter({ text: `Total: ${logs.length} logs` }).setTimestamp()], ephemeral: true });
        }

        // === EXECUTE CODE ===
        if (id === 'owner_exec') {
          interaction.reply({ embeds: [infoEmbed('Execute Code', 'Type JavaScript code to execute (dangerous!).\nType `cancel` to cancel.')], ephemeral: true });
          const filter = m => m.author.id === interaction.user.id;
          const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });
          collector.on('collect', async m => {
            if (m.content.toLowerCase() === 'cancel') { m.reply('Cancelled.'); return; }
            try {
              const code = m.content.replace(/```js\n?/g, '').replace(/```/g, '').trim();
              const result = await eval(`(async () => { ${code} })()`);
              const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2) || 'undefined';
              m.reply({ embeds: [new EmbedBuilder().setColor(0x00d26a).setTitle('💻 Execution Result').setDescription(`\`\`\`js\n${output.slice(0, 3500)}\n\`\`\``).setTimestamp()] });
            } catch (err) {
              m.reply({ embeds: [new EmbedBuilder().setColor(0xff4757).setTitle('💻 Execution Error').setDescription(`\`\`\`\n${err.message?.slice(0, 3500)}\n\`\`\``).setTimestamp()] });
            }
          });
        }

        // === TOGGLE AI ===
        if (id === 'owner_toggleai') {
          const settings = await GuildSettings.findOne({ guildId }).catch(() => null);
          if (!settings) {
            await GuildSettings.create({ guildId });
            return interaction.reply({ embeds: [infoEmbed('AI', 'Settings created. Use /aichannel to configure.')], ephemeral: true });
          }
          settings.ai = settings.ai || {};
          settings.ai.enabled = !settings.ai.enabled;
          // Auto-add current channel when enabling
          if (settings.ai.enabled) {
            settings.ai.channels = settings.ai.channels || [];
            if (!settings.ai.channels.includes(interaction.channel.id)) {
              settings.ai.channels.push(interaction.channel.id);
            }
          }
          await settings.save();
          const channelMsg = settings.ai.enabled ? `\nChannel <#${interaction.channel.id}> added as AI chat channel.` : '';
          interaction.reply({ embeds: [successEmbed('AI Toggled', `AI is now **${settings.ai.enabled ? 'ENABLED ✅' : 'DISABLED ❌'}** for this server.${channelMsg}`)], ephemeral: true });
        }

        // === TOGGLE LEVELING ===
        if (id === 'owner_togglelevel') {
          const settings = await GuildSettings.findOne({ guildId }).catch(() => null);
          if (!settings) {
            await GuildSettings.create({ guildId });
            return interaction.reply({ embeds: [infoEmbed('Leveling', 'Settings created.')], ephemeral: true });
          }
          settings.leveling = settings.leveling || {};
          settings.leveling.enabled = !settings.leveling.enabled;
          await settings.save();
          interaction.reply({ embeds: [successEmbed('Leveling Toggled', `Leveling is now **${settings.leveling.enabled ? 'ENABLED ✅' : 'DISABLED ❌'}**.`)], ephemeral: true });
        }

        // === RELOAD COMMANDS ===
        if (id === 'owner_reloadcmds') {
          const { loadCommands } = require('../handlers/commandHandler');
          loadCommands(client);
          interaction.reply({ embeds: [successEmbed('Commands Reloaded', `Reloaded **${client.commands.size}** commands.`)], ephemeral: true });
        }

        // === DM USER ===
        if (id === 'owner_dm') {
          interaction.reply({ embeds: [infoEmbed('DM User', 'Mention a user or paste their ID, then type your message.\nFormat: `@user your message`\nType `cancel` to cancel.')], ephemeral: true });
          const filter = m => m.author.id === interaction.user.id;
          const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });
          collector.on('collect', async m => {
            if (m.content.toLowerCase() === 'cancel') { m.reply('Cancelled.'); return; }
            const match = m.content.match(/<@!?(\d+)>\s*(.+)/s);
            if (!match) { m.reply('Format: `@user your message`'); return; }
            try {
              const user = await client.users.fetch(match[1]);
              await user.send({ content: match[2].trim() });
              m.reply({ embeds: [successEmbed('DM Sent', `Message sent to **${user.tag}**.`)] });
            } catch (err) {
              m.reply({ embeds: [errorEmbed('DM Failed', 'Could not DM the user. They may have DMs disabled.')] });
            }
          });
        }
      }

      // === BYPASS TOGGLE BUTTONS ===
      if (id.startsWith('bypass_')) {
        const { isOwner, bypassFlags } = require('../commands/admin/owner');
        if (!isOwner(interaction.user.id)) return interaction.reply({ embeds: [errorEmbed('Access Denied', 'Owner only.')], ephemeral: true });
        const feature = id.replace('bypass_', '');
        if (!bypassFlags.has(guildId)) bypassFlags.set(guildId, new Set());
        const guildBypass = bypassFlags.get(guildId);
        if (guildBypass.has(feature)) {
          guildBypass.delete(feature);
        } else {
          guildBypass.add(feature);
        }
        const status = guildBypass.has(feature) ? 'ENABLED ✅' : 'DISABLED ❌';
        interaction.reply({ embeds: [successEmbed(`Bypass: ${feature}`, `**${feature}** bypass is now **${status}** for this server.`)], ephemeral: true });
      }

      // === FEATURES PANEL BUTTONS ===
      if (id.startsWith('feat_')) {
        const { isOwner: isOwn, isAdmin: isAdm } = require('../commands/admin/owner');
        if (!isOwn(interaction.user.id) && !isAdm(interaction.guild.id, interaction.user.id)) {
          return interaction.reply({ embeds: [errorEmbed('Access Denied', 'Admin access required.')], ephemeral: true });
        }

        if (id === 'feat_enable_all') {
          await GuildSettings.updateOne({ guildId }, { $set: { disabledCommands: [], disabledCategories: [] } });
          interaction.reply({ embeds: [successEmbed('All Enabled', 'All commands and categories have been **enabled** ✅')], ephemeral: true });
        }
        if (id === 'feat_disable_fun') {
          const settings = await GuildSettings.findOne({ guildId });
          const dc = settings?.disabledCategories || [];
          if (!dc.includes('fun')) await GuildSettings.updateOne({ guildId }, { $push: { disabledCategories: 'fun' } });
          interaction.reply({ embeds: [successEmbed('Fun Disabled', 'The **fun** category has been **disabled** 🔴')], ephemeral: true });
        }
        if (id === 'feat_disable_game') {
          const settings = await GuildSettings.findOne({ guildId });
          const dc = settings?.disabledCategories || [];
          if (!dc.includes('game')) await GuildSettings.updateOne({ guildId }, { $push: { disabledCategories: 'game' } });
          interaction.reply({ embeds: [successEmbed('Games Disabled', 'The **game** category has been **disabled** 🔴')], ephemeral: true });
        }
        if (id === 'feat_disable_music') {
          const settings = await GuildSettings.findOne({ guildId });
          const dc = settings?.disabledCategories || [];
          if (!dc.includes('music')) await GuildSettings.updateOne({ guildId }, { $push: { disabledCategories: 'music' } });
          interaction.reply({ embeds: [successEmbed('Music Disabled', 'The **music** category has been **disabled** 🔴')], ephemeral: true });
        }
        if (id === 'feat_refresh') {
          const settings = await GuildSettings.findOne({ guildId }) || await GuildSettings.create({ guildId });
          const disabledCommands = settings.disabledCommands || [];
          const disabledCategories = settings.disabledCategories || [];
          const categories = {};
          for (const [, cmd] of interaction.client.commands) {
            const cat = cmd.data?.category || 'other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd.data.name);
          }
          const lines = Object.entries(categories).map(([cat, cmds]) => {
            const disabled = disabledCategories.includes(cat);
            return `${disabled ? '🔴' : '🟢'} **${cat.toUpperCase()}** (${cmds.length})`;
          });
          const { panelEmbed, COLORS } = require('../utils/embeds');
          const embed = panelEmbed({
            title: '📋 Feature Status (Refreshed)',
            description: lines.join('\n'),
            color: COLORS.admin,
            fields: [
              { name: '🔴 Disabled Categories', value: disabledCategories.length ? disabledCategories.map(c => `\`${c}\``).join(', ') : 'None', inline: true },
              { name: '🔒 Disabled Commands', value: disabledCommands.length ? disabledCommands.map(c => `\`/${c}\``).join(', ') : 'None', inline: true },
            ],
          });
          interaction.update({ embeds: [embed], ephemeral: true });
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
          admin_toggleaiwarn: ['aiWarning.enabled', 'AI Warning'],
          admin_togglesecurity: ['security.enabled', 'Security'],
        };

        if (toggleMap[id]) {
          const [path, name] = toggleMap[id];
          const settings = await GuildSettings.findOne({ guildId }).catch(() => null);
          if (!settings) { await GuildSettings.create({ guildId }); }
          const parts = path.split('.');
          const current = settings?.[parts[0]]?.[parts[1]];
          await GuildSettings.updateOne({ guildId }, { [path]: !current });

          // When enabling AI, auto-add current channel as AI channel
          if (id === 'admin_toggleai' && !current) {
            const aiChannels = settings?.ai?.channels || [];
            if (!aiChannels.includes(interaction.channel.id)) {
              await GuildSettings.updateOne({ guildId }, { $push: { 'ai.channels': interaction.channel.id } });
            }
            return interaction.reply({ embeds: [successEmbed(name, `${name} has been **enabled** ✅\nThis channel (<#${interaction.channel.id}>) is now an AI chat channel. The bot will respond to all messages here.`)], ephemeral: true });
          }

          interaction.reply({ embeds: [successEmbed(name, `${name} has been **${!current ? 'enabled' : 'disabled'}**.`)], ephemeral: true });
        }

        if (id === 'admin_refresh') {
          const settings = await GuildSettings.findOne({ guildId }).catch(() => null);
          const modules = settings ? [
            { name: 'Moderation', emoji: '⚖️', enabled: settings.moderation?.enabled },
            { name: 'AutoMod', emoji: '🤖', enabled: settings.automod?.enabled },
            { name: 'Welcome', emoji: '👋', enabled: settings.welcome?.enabled },
            { name: 'Leveling', emoji: '📈', enabled: settings.leveling?.enabled },
            { name: 'Economy', emoji: '💰', enabled: settings.economy?.enabled },
            { name: 'Tickets', emoji: '🎫', enabled: settings.tickets?.enabled },
            { name: 'AI Chat', emoji: '🧠', enabled: settings.ai?.enabled },
            { name: 'AI Warn', emoji: '🚨', enabled: settings.aiWarning?.enabled },
            { name: 'Security', emoji: '🔒', enabled: settings.security?.enabled },
            { name: 'Logging', emoji: '📝', enabled: settings.logging?.enabled },
          ] : [];
          const dc = settings?.disabledCategories || [];
          const dcmd = settings?.disabledCommands || [];
          const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🛡️ Server Control Panel (Refreshed)')
            .setDescription(
              `> **Server:** ${interaction.guild.name}\n` +
              `> **Access:** ${isOwner(interaction.user.id) ? '👑 Owner' : '🛡️ Admin'}\n` +
              `> **Disabled:** ${dc.length} categories, ${dcmd.length} commands`
            )
            .addFields(
              { name: '📊 Server Overview', value: `👥 **${interaction.guild.memberCount}** members\n💬 **${interaction.guild.channels.cache.size}** channels\n🎭 **${interaction.guild.roles.cache.size}** roles\n😀 **${interaction.guild.emojis.cache.size}** emojis`, inline: true },
              { name: '🔧 Module Status', value: settings ? modules.map(m => `${m.enabled ? '🟢' : '🔴'} ${m.emoji} **${m.name}**`).join('\n') : 'Not initialized', inline: true },
              { name: '⚡ Quick Actions', value: '• **/features status** — see all commands\n• **/features toggle** — enable/disable categories\n• Buttons below toggle core modules', inline: false },
            )
            .setFooter({ text: `Admin Panel • ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp()
            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }));

          const r1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_togglemod').setLabel('Moderation').setStyle(settings?.moderation?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('⚖️'),
            new ButtonBuilder().setCustomId('admin_toggleautomod').setLabel('AutoMod').setStyle(settings?.automod?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('🤖'),
            new ButtonBuilder().setCustomId('admin_togglewelcome').setLabel('Welcome').setStyle(settings?.welcome?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('👋'),
            new ButtonBuilder().setCustomId('admin_toggleleveling').setLabel('Leveling').setStyle(settings?.leveling?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('📈'),
            new ButtonBuilder().setCustomId('admin_refresh').setLabel('Refresh').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
          );
          const r2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_toggleeconomy').setLabel('Economy').setStyle(settings?.economy?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('💰'),
            new ButtonBuilder().setCustomId('admin_toggletickets').setLabel('Tickets').setStyle(settings?.tickets?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('🎫'),
            new ButtonBuilder().setCustomId('admin_toggleai').setLabel('AI Chat').setStyle(settings?.ai?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('🧠'),
            new ButtonBuilder().setCustomId('admin_toggleaiwarn').setLabel('AI Warn').setStyle(settings?.aiWarning?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('🚨'),
            new ButtonBuilder().setCustomId('admin_features').setLabel('Features').setStyle(ButtonStyle.Primary).setEmoji('📋'),
          );
          const r3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('admin_togglesecurity').setLabel('Security').setStyle(settings?.security?.enabled ? ButtonStyle.Success : ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('admin_purgeall').setLabel('Purge Channel').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
            new ButtonBuilder().setCustomId('admin_serverstats').setLabel('Server Stats').setStyle(ButtonStyle.Primary).setEmoji('📊'),
            new ButtonBuilder().setCustomId('admin_rolelist').setLabel('Role List').setStyle(ButtonStyle.Secondary).setEmoji('📋'),
            new ButtonBuilder().setCustomId('admin_refresh').setLabel('Refresh').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
          );
          interaction.update({ embeds: [embed], components: [r1, r2, r3] }).catch(() => {});
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

        if (id === 'admin_features') {
          const settings = await GuildSettings.findOne({ guildId }) || await GuildSettings.create({ guildId });
          const disabledCommands = settings.disabledCommands || [];
          const disabledCategories = settings.disabledCategories || [];
          const categories = {};
          for (const [, cmd] of client.commands) {
            const cat = cmd.data?.category || 'other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd.data.name);
          }
          const catEmojis = { fun: '🎮', ai: '🤖', game: '🎯', music: '🎵', utility: '🔧', economy: '💰', moderation: '🛡️', admin: '⚙️', leveling: '📊', other: '📦' };
          const lines = Object.entries(categories).map(([cat, cmds]) => {
            const disabled = disabledCategories.includes(cat);
            return `${disabled ? '🔴' : '🟢'} ${catEmojis[cat] || '📦'} **${cat.toUpperCase()}** (${cmds.length} cmds)${disabled ? ' — DISABLED' : ''}`;
          });
          const embed = new EmbedBuilder().setColor(0x3498db).setTitle('📋 Feature Status')
            .setDescription(lines.join('\n'))
            .addFields(
              { name: '🔴 Disabled Categories', value: disabledCategories.length ? disabledCategories.map(c => `\`${c}\``).join(', ') : 'None', inline: true },
              { name: '🔒 Disabled Commands', value: disabledCommands.length ? disabledCommands.map(c => `\`/${c}\``).join(', ') : 'None', inline: true },
            ).setTimestamp();
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('feat_enable_all').setLabel('Enable All').setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId('feat_disable_fun').setLabel('Disable Fun').setStyle(ButtonStyle.Secondary).setEmoji('🎮'),
            new ButtonBuilder().setCustomId('feat_disable_game').setLabel('Disable Games').setStyle(ButtonStyle.Secondary).setEmoji('🎯'),
            new ButtonBuilder().setCustomId('feat_disable_music').setLabel('Disable Music').setStyle(ButtonStyle.Secondary).setEmoji('🎵'),
          );
          interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        if (id === 'admin_channels') {
          const g = interaction.guild;
          const text = g.channels.cache.filter(c => c.type === 0).size;
          const voice = g.channels.cache.filter(c => c.type === 2).size;
          const cats = g.channels.cache.filter(c => c.type === 4).size;
          const announcements = g.channels.cache.filter(c => c.type === 5).size;
          const forums = g.channels.cache.filter(c => c.type === 15).size;
          const stages = g.channels.cache.filter(c => c.type === 13).size;
          const embed = new EmbedBuilder().setColor(0x3b82f6).setTitle('💬 Channel Overview')
            .addFields(
              { name: '📝 Text', value: `${text}`, inline: true },
              { name: '🔊 Voice', value: `${voice}`, inline: true },
              { name: '📁 Categories', value: `${cats}`, inline: true },
              { name: '📢 Announcements', value: `${announcements}`, inline: true },
              { name: '📋 Forums', value: `${forums}`, inline: true },
              { name: '🎤 Stages', value: `${stages}`, inline: true },
              { name: '📊 Total', value: `${g.channels.cache.size} channels`, inline: false },
            ).setTimestamp();
          interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }

      // === HELP BUTTONS ===
      if (id.startsWith('help_')) {
        const category = id.replace('help_', '');
        const catEmojis = { fun: '🎮', ai: '🤖', game: '🎯', music: '🎵', utility: '🔧', economy: '💰', moderation: '🛡️', admin: '⚙️', leveling: '📊', security: '🔒', other: '📦', tickets: '🎫' };
        const catColors = { fun: 0xff6b81, ai: 0x4285f4, game: 0x9b59b6, music: 0x1db954, utility: 0x3b82f6, economy: 0xf1c40f, moderation: 0xe74c3c, admin: 0x3498db, leveling: 0xffd700, security: 0xff4757, other: 0x2f3136, tickets: 0x00bcd4 };
        const categories = {};
        for (const [, cmd] of client.commands) {
          const cat = cmd.data?.category || 'other';
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push({ name: cmd.data.name, desc: cmd.data.description || 'No description' });
        }
        const cmds = categories[category] || [];
        if (cmds.length === 0) {
          return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4757).setTitle('❌ No Commands').setDescription(`No commands found in **${category}**.`).setTimestamp()], ephemeral: true });
        }
        const emoji = catEmojis[category] || '📦';
        const lines = cmds.map(c => `> \`/${c.name}\` — ${c.desc}`).join('\n');
        const embed = new EmbedBuilder()
          .setColor(catColors[category] || 0x2f3136)
          .setTitle(`${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
          .setDescription(lines)
          .addFields({ name: '📊 Total', value: `${cmds.length} commands`, inline: true })
          .setFooter({ text: `Use /help to see all categories • ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();
        interaction.reply({ embeds: [embed], ephemeral: true });
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
