require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

// ─── Discord Client ───
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember],
});

// ─── In-memory stores ───
client.antiSpam = new Map();
client.xpCooldowns = new Map();
client.aiMemory = new Map();
client.voiceXpIntervals = new Map();

console.log('[VOID BOT] Starting...');

// ─── Load Commands & Events ───
loadCommands(client);
loadEvents(client);

// ─── Init SQLite, then start bot + dashboard ───
(async () => {
  // Initialize SQLite database (auto-creates tables)
  try {
    require('./lib/database');
    console.log('[VOID BOT] SQLite database ready');
  } catch (err) {
    console.error('[VOID BOT] Database init failed:', err.message);
  }

  // Init AI services
  try {
    const aiService = require('./services/aiService');
    aiService.initAI();
    const ticketAI = require('./services/ticketAIService');
    ticketAI.init();
  } catch (err) {
    console.error('[VOID BOT] AI init failed:', err.message);
  }

  // Start the web dashboard
  try {
    const { createDashboard } = require('./dashboard/server');
    createDashboard(client);
  } catch (err) {
    console.error('[VOID BOT] Dashboard failed to start:', err.message);
  }

  // Login the bot
  client.login(process.env.DISCORD_TOKEN);
})();

// ─── Graceful shutdown ───
process.on('SIGINT', async () => {
  console.log('\n[VOID BOT] Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('[VOID BOT] Unhandled rejection:', err);
});
