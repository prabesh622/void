const GuildSettings = require('../schemas/GuildSettings');

/** Track recent joins for anti-raid detection */
const recentJoins = new Map(); // guildId => [timestamps]

/** Track recent channel/role deletes for anti-nuke */
const recentDeletes = new Map(); // guildId => [timestamps]

/** Check for raid pattern (mass joins) */
async function checkRaid(guildId) {
  const settings = await GuildSettings.findOne({ guildId });
  if (!settings?.security?.antiRaid) return false;

  const threshold = settings.security.raidThreshold || 10;
  const timeframe = settings.security.raidTimeframe || 10000;
  const now = Date.now();

  if (!recentJoins.has(guildId)) recentJoins.set(guildId, []);
  const joins = recentJoins.get(guildId);
  joins.push(now);

  // Clean old entries
  const recent = joins.filter(t => now - t < timeframe);
  recentJoins.set(guildId, recent);

  return recent.length >= threshold;
}

/** Check for nuke pattern (mass deletes) */
async function checkNuke(guildId) {
  const settings = await GuildSettings.findOne({ guildId });
  if (!settings?.security?.antiNuke) return false;

  const threshold = settings.security.nukeThreshold || 5;
  const now = Date.now();

  if (!recentDeletes.has(guildId)) recentDeletes.set(guildId, []);
  const deletes = recentDeletes.get(guildId);
  deletes.push(now);

  const recent = deletes.filter(t => now - t < 30000); // 30 second window
  recentDeletes.set(guildId, recent);

  return recent.length >= threshold;
}

/** Known scam link patterns */
const SCAM_PATTERNS = [
  /discord(?:app)?\.com\/nitro\/gift/i,
  /(?:free|claim|gift).*nitro/i,
  /(?:steam|csgo).*free.*skin/i,
  /dlscord\.(?:com|gift|org|ru)/i,
  /discord\.gift.*(?:free|claim)/i,
];

/** Check if a message contains scam links */
function isScamLink(content) {
  return SCAM_PATTERNS.some(p => p.test(content));
}

/** Record a channel/role delete event */
function recordDelete(guildId) {
  const now = Date.now();
  if (!recentDeletes.has(guildId)) recentDeletes.set(guildId, []);
  recentDeletes.get(guildId).push(now);
}

module.exports = { checkRaid, checkNuke, isScamLink, recordDelete, recentJoins };
