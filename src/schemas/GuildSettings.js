/**
 * GuildSettings - Supabase compatibility wrapper
 * Table: guild_settings (id, guild_id, settings JSONB, created_at, updated_at)
 * The 'settings' JSONB column stores the entire nested config object.
 */
const { supabase } = require('../lib/supabase');

const TABLE = 'guild_settings';

/** Default settings structure matching the original Mongoose schema */
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
  security: { enabled: false, antiRaid: false, raidThreshold: 10, raidTimeframe: 10000, antiNuke: false, nukeThreshold: 5, scamLinks: true, mentionSpam: false, webhookSpam: true, autoBan: false, logChannel: '' },
  verification: { enabled: false, channelId: '', messageId: '', type: 'button', verifiedRole: '', minAccountAge: 0, antiAlt: false },
  reactionRoles: { enabled: false },
  customCommands: { enabled: false },
  suggestions: { enabled: false, channelId: '' },
  ticketAI: { enabled: false, categoryId: '', channelPatterns: ['ticket-'], questions: [], maxQuestions: 3, qualificationThreshold: 2, staffRoleId: '', logChannelId: '' },
};

/** Deep merge source into target (non-destructive) */
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

/** Set a nested value by dot-notation path on an object */
function setNested(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

/** Get a nested value by dot-notation path */
function getNested(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

/** Push a value into a nested array by dot-notation path */
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

/** Pull a value from a nested array by dot-notation path */
function pullNested(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  const arrKey = keys[keys.length - 1];
  if (Array.isArray(cur[arrKey])) {
    cur[arrKey] = cur[arrKey].filter(v => v !== value);
  }
}

/** Increment a nested numeric value */
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

/** Wrap a raw row to expose settings as top-level properties */
function wrapRow(row) {
  if (!row) return null;
  const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {});
  const merged = deepMerge(DEFAULT_SETTINGS, settings);

  // Create a proxy-like object that exposes settings fields + guildId
  const obj = {
    _id: row.id,
    id: row.id,
    guildId: row.guild_id,
    ...merged,
    _raw: row,
    _table: TABLE,
  };

  obj.save = async function () {
    const { moderation, automod, welcome, logging, tickets, leveling, economy, giveaways, ai, security, verification, reactionRoles, customCommands, suggestions, ticketAI, ...rest } = this;
    const newSettings = { moderation, automod, welcome, logging, tickets, leveling, economy, giveaways, ai, security, verification, reactionRoles, customCommands, suggestions, ticketAI };
    const { data, error } = await supabase
      .from(TABLE)
      .update({ settings: newSettings })
      .eq('id', this.id)
      .select()
      .single();
    if (error) throw error;
    return wrapRow(data);
  };

  return obj;
}

const GuildSettings = {
  async findOne(filter) {
    const guildId = filter.guildId || filter.guild_id;
    const { data, error } = await supabase
      .from(TABLE)
      .select()
      .eq('guild_id', guildId)
      .single();
    if (error || !data) return null;
    return wrapRow(data);
  },

  async create(inputData) {
    const guildId = inputData.guildId || inputData.guild_id;
    const settings = deepMerge(DEFAULT_SETTINGS, {});
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ guild_id: guildId, settings })
      .select()
      .single();
    if (error) {
      // If duplicate, fetch existing
      if (error.code === '23505') {
        return await this.findOne({ guildId });
      }
      throw error;
    }
    return wrapRow(data);
  },

  /**
   * Update guild settings. Supports:
   * - Dot-notation: { 'moderation.enabled': true }
   * - $push / $pull on nested arrays: { $push: { 'ai.channels': '123' } }
   * - $inc on nested numbers: { $inc: { 'tickets.nextTicketId': 1 } }
   * - Plain nested keys: { moderation: { enabled: true } }
   */
  async updateOne(filter, updates) {
    const existing = await this.findOne(filter);
    if (!existing) {
      // Upsert: create if not found
      const created = await this.create(filter);
      return await this.updateOne(filter, updates);
    }

    const settings = typeof existing._raw.settings === 'string'
      ? JSON.parse(existing._raw.settings)
      : { ...existing._raw.settings };
    const merged = deepMerge(DEFAULT_SETTINGS, settings || {});

    // Apply $inc
    if (updates.$inc) {
      for (const [path, amount] of Object.entries(updates.$inc)) {
        incNested(merged, path, amount);
      }
    }

    // Apply $push
    if (updates.$push) {
      for (const [path, value] of Object.entries(updates.$push)) {
        pushNested(merged, path, value);
      }
    }

    // Apply $pull
    if (updates.$pull) {
      for (const [path, value] of Object.entries(updates.$pull)) {
        pullNested(merged, path, value);
      }
    }

    // Apply $set
    if (updates.$set) {
      for (const [path, value] of Object.entries(updates.$set)) {
        setNested(merged, path, value);
      }
    }

    // Apply plain dot-notation keys
    for (const [key, value] of Object.entries(updates)) {
      if (key.startsWith('$')) continue;
      if (key.includes('.')) {
        setNested(merged, key, value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = deepMerge(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }

    const { error } = await supabase
      .from(TABLE)
      .update({ settings: merged })
      .eq('guild_id', filter.guildId || filter.guild_id);
    if (error) throw error;
  },

  async findOneAndUpdate(filter, updates, opts = {}) {
    if (opts.upsert) {
      let existing = await this.findOne(filter);
      if (!existing) {
        existing = await this.create(filter);
      }
    }
    await this.updateOne(filter, updates);
    return await this.findOne(filter);
  },

  async deleteOne(filter) {
    const guildId = filter.guildId || filter.guild_id;
    const { error } = await supabase.from(TABLE).delete().eq('guild_id', guildId);
    if (error) throw error;
  },
};

module.exports = GuildSettings;
