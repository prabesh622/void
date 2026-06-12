/**
 * GuildSettings — SQLite version
 * Table: guild_settings (id, guild_id, data JSON)
 * The 'data' column stores the entire nested config object as JSON.
 */
const { db } = require('../lib/database');

const TABLE = 'guild_settings';

const DEFAULT_SETTINGS = {
  moderation: { enabled: true, logChannel: '', dmOnAction: true },
  automod: { enabled: false, antiSpam: false, antiLink: false, antiCaps: false, capsThreshold: 70, antiMentionSpam: false, mentionSpamLimit: 5, badWords: [], ignoredRoles: [], ignoredChannels: [], logChannel: '' },
  welcome: { enabled: false, channelId: '', welcomeMessage: 'Welcome {user} to {server}!', goodbyeMessage: '{user} has left the server.', autoRole: '', welcomeImage: false },
  logging: { enabled: false, channelId: '', messageEdit: true, messageDelete: true, memberJoin: true, memberLeave: true, voice: true, channelCreate: true, channelDelete: true, roleCreate: true, roleDelete: true, roleUpdate: true, moderation: true, serverUpdate: true, ignoredChannels: [], ignoredRoles: [] },
  tickets: { enabled: false, categoryId: '', staffRoleId: '', transcriptChannelId: '', panels: [], nextTicketId: 1 },
  leveling: { enabled: true, xpPerMessage: 20, xpCooldown: 60, voiceXpPerMinute: 1, levelUpMessage: '\u{1F389} {user} just reached Level {level}!', levelUpChannel: '', noXpChannels: [], roleMultipliers: [], rewards: [], prestige: false, prestigeLevel: 100 },
  economy: { enabled: true, dailyMin: 200, dailyMax: 700, dailyCooldown: 86400000, workCooldown: 7200000, currencySymbol: '$', logChannel: '' },
  giveaways: { enabled: true, defaultDuration: '24h', emoji: '\u{1F389}' },
  ai: { enabled: false, channels: [], mentionMode: true, autoReply: false, personality: 'friendly', customPrompt: '', cooldown: 5, nsfwFilter: true, maxHistory: 10 },
  aiWarning: { enabled: false, logChannel: '', minSeverity: 'medium', ignoredRoles: [], ignoredChannels: [] },
  security: { enabled: false, antiRaid: false, raidThreshold: 10, raidTimeframe: 10000, antiNuke: false, nukeThreshold: 5, scamLinks: true, mentionSpam: false, webhookSpam: true, autoBan: false, logChannel: '' },
  verification: { enabled: false, channelId: '', messageId: '', type: 'button', verifiedRole: '', minAccountAge: 0, antiAlt: false },
  reactionRoles: { enabled: false },
  customCommands: { enabled: false },
  suggestions: { enabled: false, channelId: '' },
  autoEmoji: { enabled: true },
  ticketAI: { enabled: false, categoryId: '', channelPatterns: ['ticket-'], questions: [], maxQuestions: 3, qualificationThreshold: 2, staffRoleId: '', logChannelId: '' },
  disabledCommands: [],
  disabledCategories: [],
};

function deepMerge(target, source) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function setNested(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function getNested(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function pushNested(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  const arrKey = keys[keys.length - 1];
  if (!Array.isArray(cur[arrKey])) cur[arrKey] = [];
  cur[arrKey].push(value);
}

function pullNested(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  const arrKey = keys[keys.length - 1];
  if (Array.isArray(cur[arrKey])) cur[arrKey] = cur[arrKey].filter(v => v !== value);
}

function incNested(obj, path, amount) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  const lastKey = keys[keys.length - 1];
  cur[lastKey] = (cur[lastKey] || 0) + amount;
}

function wrapRow(row) {
  if (!row) return null;
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
  const merged = deepMerge(DEFAULT_SETTINGS, data);
  const obj = {
    _id: row.id,
    id: row.id,
    guildId: row.guild_id,
    ...merged,
    _raw: row,
    _table: TABLE,
  };

  obj.save = async function () {
    const { _id: _a, id: _b, guildId: _c, _raw: _d, _table: _e, save: _f, ...settingsData } = this;
    db.prepare(`UPDATE ${TABLE} SET data = ? WHERE id = ?`).run(JSON.stringify(settingsData), this.id);
    return this;
  };

  return obj;
}

const GuildSettings = {
  async findOne(filter) {
    const guildId = filter.guildId || filter.guild_id;
    const row = db.prepare(`SELECT * FROM ${TABLE} WHERE guild_id = ? LIMIT 1`).get(guildId);
    return wrapRow(row);
  },

  async create(inputData) {
    const guildId = inputData.guildId || inputData.guild_id;
    const data = JSON.stringify(deepMerge(DEFAULT_SETTINGS, {}));
    try {
      const result = db.prepare(`INSERT INTO ${TABLE} (guild_id, data) VALUES (?, ?)`).run(guildId, data);
      const row = db.prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).get(result.lastInsertRowid);
      return wrapRow(row);
    } catch (err) {
      if (err.message.includes('UNIQUE')) return await this.findOne({ guildId });
      throw err;
    }
  },

  async updateOne(filter, updates) {
    const existing = await this.findOne(filter);
    if (!existing) {
      await this.create(filter);
      return await this.updateOne(filter, updates);
    }

    const raw = typeof existing._raw.data === 'string' ? JSON.parse(existing._raw.data) : { ...existing._raw.data };
    const merged = deepMerge(DEFAULT_SETTINGS, raw || {});

    if (updates.$inc) {
      for (const [path, amount] of Object.entries(updates.$inc)) incNested(merged, path, amount);
    }
    if (updates.$push) {
      for (const [path, value] of Object.entries(updates.$push)) pushNested(merged, path, value);
    }
    if (updates.$pull) {
      for (const [path, value] of Object.entries(updates.$pull)) pullNested(merged, path, value);
    }
    if (updates.$set) {
      for (const [path, value] of Object.entries(updates.$set)) setNested(merged, path, value);
    }
    for (const [key, value] of Object.entries(updates)) {
      if (key.startsWith('$')) continue;
      if (key.includes('.')) setNested(merged, key, value);
      else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = deepMerge(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }

    db.prepare(`UPDATE ${TABLE} SET data = ? WHERE guild_id = ?`).run(JSON.stringify(merged), existing.guildId);
  },

  async findOneAndUpdate(filter, updates, opts = {}) {
    if (opts.upsert) {
      let existing = await this.findOne(filter);
      if (!existing) existing = await this.create(filter);
    }
    await this.updateOne(filter, updates);
    return await this.findOne(filter);
  },

  async deleteOne(filter) {
    const guildId = filter.guildId || filter.guild_id;
    db.prepare(`DELETE FROM ${TABLE} WHERE guild_id = ?`).run(guildId);
  },
};

module.exports = GuildSettings;
