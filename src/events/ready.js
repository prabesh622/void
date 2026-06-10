const { REST, Routes, ActivityType } = require('discord.js');
const Reminder = require('../schemas/Reminder');
const Giveaway = require('../schemas/Giveaway');
const { infoEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`\n[VOID BOT] Logged in as ${client.user.tag}`);
    console.log(`[VOID BOT] Serving ${client.guilds.cache.size} guild(s)`);
    console.log(`[VOID BOT] ${client.commands.size} command(s) loaded\n`);

    // Register slash commands globally
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: client.commandArray });
      console.log('[VOID BOT] Slash commands registered globally');
    } catch (err) {
      console.error('[VOID BOT] Failed to register commands:', err);
    }

    client.user.setActivity('/help | Void Bot', { type: ActivityType.Watching });

    // Reminder checker (every 15s)
    setInterval(async () => {
      try {
        const now = Date.now();
        const due = await Reminder.find({ remindAt: { $lte: now } });
        for (const reminder of due) {
          await Reminder.findByIdAndDelete(reminder.id);
          try {
            const user = await client.users.fetch(reminder.userId);
            await user.send({ embeds: [infoEmbed('Reminder', reminder.message)] });
          } catch {
            const channel = client.channels.cache.get(reminder.channelId);
            if (channel) channel.send({ content: `<@${reminder.userId}>`, embeds: [infoEmbed('Reminder', reminder.message)] });
          }
        }
      } catch {}
    }, 15000);

    // Giveaway auto-end checker (every 30s)
    setInterval(async () => {
      try {
        const now = Date.now();
        const expired = await Giveaway.find({ status: 'running', endAt: { $lte: now } });
        for (const gw of expired) {
          gw.status = 'ended';
          const shuffled = [...gw.entries].sort(() => Math.random() - 0.5);
          gw.winners = shuffled.slice(0, Math.min(gw.winnersCount, shuffled.length));
          await gw.save();

          const channel = client.channels.cache.get(gw.channelId);
          if (!channel) continue;

          if (gw.entries.length === 0) {
            const { EmbedBuilder } = require('discord.js');
            channel.send({ embeds: [new EmbedBuilder().setColor(0xff4757).setTitle('Giveaway Ended').setDescription(`**Prize:** ${gw.prize}\nNo valid entries!`).setTimestamp()] });
          } else {
            const { EmbedBuilder } = require('discord.js');
            const winnerList = gw.winners.map(w => `<@${w}>`).join(', ');
            channel.send({
              content: gw.winners.map(w => `<@${w}>`).join(' '),
              embeds: [new EmbedBuilder().setColor(0x00d26a).setTitle('Giveaway Ended!').setDescription(`**Prize:** ${gw.prize}\n**Winner(s):** ${winnerList}\n**Entries:** ${gw.entries.length}`).setTimestamp()]
            });
          }
          try {
            const msg = await channel.messages.fetch(gw.messageId);
            const { EmbedBuilder } = require('discord.js');
            const winnerList = gw.winners.map(w => `<@${w}>`).join(', ') || 'None';
            msg.edit({ embeds: [new EmbedBuilder().setColor(0x2f3136).setTitle('Giveaway Ended').setDescription(`**Prize:** ${gw.prize}\n**Winner(s):** ${winnerList}`)], components: [] });
          } catch {}
        }
      } catch {}
    }, 30000);
  }
};
