const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'void-bot.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables on startup
const TABLE_SCHEMAS = {
  guild_settings: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL DEFAULT '{}'
  )`,
  afk: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    UNIQUE(guildId, userId)
  )`,
  economy: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    UNIQUE(guildId, userId)
  )`,
  levels: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    UNIQUE(guildId, userId)
  )`,
  tickets: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    ticketId INTEGER NOT NULL,
    channelId TEXT NOT NULL UNIQUE,
    userId TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}'
  )`,
  giveaways: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    channelId TEXT NOT NULL,
    messageId TEXT NOT NULL UNIQUE,
    hostId TEXT NOT NULL,
    prize TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}'
  )`,
  warnings: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    moderatorId TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}'
  )`,
  logs: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}'
  )`,
  custom_commands: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    trigger TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    UNIQUE(guildId, trigger)
  )`,
  reaction_roles: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    channelId TEXT NOT NULL,
    messageId TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL DEFAULT '{}'
  )`,
  ai_logs: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    channelId TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}'
  )`,
  suggestions: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    channelId TEXT NOT NULL,
    messageId TEXT NOT NULL,
    userId TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}'
  )`,
  reminders: `(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    channelId TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}'
  )`,
};

// Create all tables
for (const [table, schema] of Object.entries(TABLE_SCHEMAS)) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${table} ${schema}`);
}

console.log('[SQLite] Database initialized with all tables');

module.exports = { db };
