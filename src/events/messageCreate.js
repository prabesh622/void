const GuildSettings = require('../schemas/GuildSettings');
const Level = require('../schemas/Level');
const AFK = require('../schemas/AFK');
const aiService = require('../services/aiService');
const securityService = require('../services/securityService');
const ticketAIService = require('../services/ticketAIService');
const { checkFeatureCooldown } = require('../services/cooldownService');
const { cleanContent } = require('../utils/helpers');

const xpCooldowns = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;
    const guildId = message.guild.id;
    const userId = message.author.id;

    // === BLACKLIST CHECK ===
    const { isBlacklisted } = require('../commands/admin/owner');
    if (isBlacklisted(userId)) return; // Silently ignore blacklisted users

    // === AI TICKET TRIAGE ===
    // Check if this channel is pending triage (newly detected ticket channel)
    const channelCreateEvent = require('./channelCreate');
    if (channelCreateEvent.pendingTriage.has(message.channel.id)) {
      channelCreateEvent.pendingTriage.delete(message.channel.id);
      // Start triage for the user who sent the first message (likely the ticket opener)
      await ticketAIService.startTriage(message.channel, guildId, userId);
    }

    // Fallback: detect existing ticket channels not yet triaged
    if (!ticketAIService.isTriaging(message.channel.id) && !channelCreateEvent.pendingTriage.has(message.channel.id)) {
      const settings2 = await GuildSettings.findOne({ guildId }).catch(() => null);
      if (settings2?.ticketAI?.enabled) {
        const tAI = settings2.ticketAI;
        const matchesCategory = tAI.categoryId && message.channel.parentId === tAI.categoryId;
        const matchesPattern = ticketAIService.isTicketChannel(message.channel.name, tAI.channelPatterns || ['ticket-']);
        if (matchesCategory || matchesPattern) {
          await ticketAIService.startTriage(message.channel, guildId, userId);
        }
      }
    }

    // Process messages in active triage sessions
    if (ticketAIService.isTriaging(message.channel.id)) {
      const consumed = await ticketAIService.processMessage(message);
      if (consumed) return; // Message was consumed by triage, skip other handlers
    }

    const settings = await GuildSettings.findOne({ guildId }).catch(() => null);
    if (!settings) {
      await GuildSettings.create({ guildId }).catch(() => {});
    }

    // === AFK CHECK ===
    const selfAFK = await AFK.findOne({ guildId, userId });
    if (selfAFK) {
      await AFK.deleteOne({ guildId, userId });
      message.reply({ content: `Welcome back **${message.author.username}**! Your AFK status has been removed.` }).catch(() => {});
    }
    if (message.mentions.users.size > 0) {
      for (const [mentionedId, mentionedUser] of message.mentions.users) {
        if (mentionedId === userId) continue;
        const afk = await AFK.findOne({ guildId, userId: mentionedId });
        if (afk) {
          const elapsed = Math.floor((Date.now() - afk.since) / 1000);
          const timeStr = elapsed >= 3600 ? `${Math.floor(elapsed / 3600)}h ago` : elapsed >= 60 ? `${Math.floor(elapsed / 60)}m ago` : `${elapsed}s ago`;
          message.reply({ content: `**${mentionedUser.username}** is AFK: ${afk.reason} (${timeStr})` }).catch(() => {});
          break;
        }
      }
    }

    // === AI CHAT (Channel Lock System) ===
    if (settings?.ai?.enabled) {
      const isAIChannel = settings.ai.channels?.includes(message.channel.id);
      const isMention = message.mentions.has(client.user);
      const content = message.content.trim();

      // ── CHANNEL LOCK RULES ──
      // In designated AI channels: respond to ALL messages (casual chat allowed)
      // Outside AI channels: ONLY respond when @mentioned (strict lock)
      // Always skip commands and very short messages
      const shouldRespond = isAIChannel || isMention;

      if (shouldRespond && content.length >= 2 && !content.startsWith('/') && !content.startsWith('!')) {
        const aiCooldownKey = `ai-${guildId}-${userId}`;
        const aiCd = checkFeatureCooldown(aiCooldownKey, (settings.ai.cooldown || 3) * 1000);
        if (aiCd <= 0) {
          try {
            await message.channel.sendTyping();
          } catch (e) { /* ignore typing errors */ }
          const reply = await aiService.getResponse(message, settings);
          if (reply) {
            message.reply({ content: cleanContent(reply).slice(0, 1900) }).catch(err => {
              console.error('[AI CHAT] Reply error:', err.message?.slice(0, 100));
            });
          }
        }
      }
    }

    // === AI RULE WARNING SYSTEM ===
    if (settings?.aiWarning?.enabled) {
      const ignoredRole = settings.aiWarning.ignoredRoles?.some(r => message.member.roles.cache.has(r));
      const ignoredCh = settings.aiWarning.ignoredChannels?.includes(message.channel.id);
      const isAdmin = message.member.permissions.has('Administrator');

      if (!ignoredRole && !ignoredCh && !isAdmin) {
        const violation = await aiService.checkRuleViolation(message);
        if (violation) {
          // Check minimum severity threshold
          const severityLevels = { low: 1, medium: 2, high: 3 };
          const minLevel = severityLevels[settings.aiWarning.minSeverity] || 2;
          const violLevel = severityLevels[violation.severity] || 1;

          if (violLevel >= minLevel) {
            const severityEmoji = { low: '⚠️', medium: '🟠', high: '🚨' };
            const emoji = severityEmoji[violation.severity] || '⚠️';

            // Warn the user in chat
            const warnMsg = await message.channel.send({
              content: `${emoji} **${message.author.username}**, your message may violate server rules.\n> **Rule:** ${violation.rule}\n> **Reason:** ${violation.reason}\n> **Severity:** ${violation.severity}\nPlease follow the server rules to avoid further action.`,
            }).catch(() => null);

            // Auto-delete warning after 15 seconds
            if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => {}), 15000);

            // Log to log channel if configured
            if (settings.aiWarning.logChannel) {
              const logCh = message.guild.channels.cache.get(settings.aiWarning.logChannel);
              if (logCh) {
                const { EmbedBuilder } = require('discord.js');
                logCh.send({
                  embeds: [new EmbedBuilder()
                    .setColor(violation.severity === 'high' ? 0xff4757 : violation.severity === 'medium' ? 0xffa502 : 0x3b82f6)
                    .setTitle(`${emoji} AI Rule Warning`)
                    .addFields(
                      { name: '👤 User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                      { name: '💬 Channel', value: `<#${message.channel.id}>`, inline: true },
                      { name: '📏 Rule', value: violation.rule, inline: true },
                      { name: '📊 Severity', value: violation.severity, inline: true },
                      { name: '📝 Reason', value: violation.reason, inline: false },
                      { name: '💭 Message', value: message.content.slice(0, 500), inline: false },
                    )
                    .setTimestamp()
                  ],
                }).catch(() => {});
              }
            }
          }
        }
      }
    }

    // === SECURITY: SCAM LINKS ===
    if (settings?.security?.scamLinks && securityService.isScamLink(message.content)) {
      await message.delete().catch(() => {});
      message.channel.send({ content: `⚠️ **${message.author.username}**, scam links are not allowed.` }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      return;
    }

    // === LEVELING SYSTEM ===
    if (settings?.leveling?.enabled) {
      const noXp = settings.leveling.noXpChannels?.includes(message.channel.id);
      if (!noXp) {
        const cdKey = `${guildId}-${userId}`;
        const now = Date.now();
        const lastXp = xpCooldowns.get(cdKey) || 0;
        if (now - lastXp >= (settings.leveling.xpCooldown || 60) * 1000) {
          xpCooldowns.set(cdKey, now);
          let xpGain = settings.leveling.xpPerMessage || 20;

          // Role multiplier
          if (settings.leveling.roleMultipliers?.length) {
            for (const rm of settings.leveling.roleMultipliers) {
              if (message.member.roles.cache.has(rm.roleId)) {
                xpGain = Math.floor(xpGain * rm.multiplier);
                break;
              }
            }
          }

          await Level.findOneAndUpdate({ guildId, userId }, { $inc: { xp: xpGain, totalMessages: 1 }, $set: { lastXpAt: now } }, { upsert: true, new: true }).then(async doc => {
            const oldLevel = doc.level;
            const newLevel = Math.floor(0.1 * Math.sqrt(doc.xp));
            if (newLevel > oldLevel) {
              doc.level = newLevel;
              await doc.save();
              const lvlMsg = replaceVariables(settings.leveling.levelUpMessage || '🎉 {user} just reached Level {level}!', { user: `<@${userId}>`, level: newLevel, username: message.author.username });
              const lvlChannel = settings.leveling.levelUpChannel ? client.channels.cache.get(settings.leveling.levelUpChannel) : message.channel;
              lvlChannel?.send({ content: lvlMsg }).catch(() => {});

              // Role rewards
              if (settings.leveling.rewards?.length) {
                for (const reward of settings.leveling.rewards) {
                  if (reward.level === newLevel) {
                    const role = message.guild.roles.cache.get(reward.roleId);
                    if (role) await message.member.roles.add(role).catch(() => {});
                  }
                }
              }

              // Prestige check
              if (settings.leveling.prestige && newLevel >= (settings.leveling.prestigeLevel || 100)) {
                doc.prestige = (doc.prestige || 0) + 1;
                doc.xp = 0;
                doc.level = 0;
                await doc.save();
                message.channel.send({ content: `⭐ **${message.author.username}** has prestiged to **Prestige ${doc.prestige}**!` }).catch(() => {});
              }
            }
          }).catch(() => {});
        }
      }
    }

    // === AUTO-MODERATION ===
    if (settings?.automod?.enabled) {
      const ignored = settings.automod.ignoredRoles?.some(r => message.member.roles.cache.has(r));
      const ignoredChannel = settings.automod.ignoredChannels?.includes(message.channel.id);
      if (message.member.permissions.has('Administrator')) return;
      if (ignored || ignoredChannel) return;

      let violated = null, reason = '';

      if (settings.automod.antiSpam) {
        const spamKey = `spam-${guildId}-${userId}`;
        const msgs = client.antiSpam?.get(spamKey) || [];
        msgs.push(now);
        const recent = msgs.filter(t => Date.now() - t < 5000);
        client.antiSpam?.set(spamKey, recent);
        if (recent.length >= 5) { violated = 'spam'; reason = 'Anti-spam triggered'; }
      }

      if (!violated && settings.automod.antiLink) {
        if (/(https?:\/\/|discord\.gg\/|discord\.com\/invite\/)/i.test(message.content)) { violated = 'link'; reason = 'Links are not allowed'; }
      }

      if (!violated && settings.automod.antiCaps) {
        const threshold = settings.automod.capsThreshold || 70;
        const upper = (message.content.match(/[A-Z]/g) || []).length;
        if (message.content.length > 5 && (upper / message.content.length) * 100 > threshold) { violated = 'caps'; reason = 'Excessive capital letters'; }
      }

      if (!violated && settings.automod.antiMentionSpam) {
        const limit = settings.automod.mentionSpamLimit || 5;
        if (message.mentions.users.size > limit) { violated = 'mention_spam'; reason = 'Too many mentions'; }
      }

      if (!violated && settings.automod.badWords?.length) {
        const content = message.content.toLowerCase();
        if (settings.automod.badWords.some(w => content.includes(w.toLowerCase()))) { violated = 'badword'; reason = 'Message contains a filtered word'; }
      }

      if (violated) {
        await message.delete().catch(() => {});
        const warn = await message.channel.send({ content: `⚠️ **${message.author.username}**, ${reason}.` });
        setTimeout(() => warn.delete().catch(() => {}), 5000);

        if (settings.automod.logChannel) {
          const logCh = message.guild.channels.cache.get(settings.automod.logChannel);
          if (logCh) {
            const { EmbedBuilder } = require('discord.js');
            logCh.send({ embeds: [new EmbedBuilder().setColor(0xff4757).setTitle('AutoMod').setDescription(`**User:** ${message.author.tag}\n**Channel:** <#${message.channel.id}>\n**Reason:** ${reason}\n**Content:** ${message.content.slice(0, 200)}`).setTimestamp()] });
          }
        }
      }
    }

    // === AUTO EMOJI REACTIONS ===
    // Detect custom emojis in messages and react with them
    if (settings?.autoEmoji?.enabled !== false) { // enabled by default
      const emojiMatches = message.content.match(/<a?:\w+:\d+>/g);
      if (emojiMatches && emojiMatches.length <= 5) {
        for (const emojiStr of emojiMatches.slice(0, 3)) {
          const idMatch = emojiStr.match(/:(\d+)>$/);
          if (idMatch) {
            const emoji = message.guild.emojis.cache.get(idMatch[1]);
            if (emoji) {
              await message.react(emoji).catch(() => {});
            }
          }
        }
      }
    }
  }
};
