const { REST, Routes, ActivityType } = require('discord.js');

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
  }
};
