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

// ─── Init Supabase, then start bot + dashboard ───
(async () => {
  // Verify Supabase connection
  try {
    const { supabase } = require('./lib/supabase');
    const { error } = await supabase.from('guild_settings').select('id').limit(1);
    if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
      console.error('[VOID BOT] Supabase connection failed:', error.message);
    } else {
      console.log('[VOID BOT] Connected to Supabase');
    }
  } catch (err) {
    console.error('[VOID BOT] Supabase init failed:', err.message);
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
