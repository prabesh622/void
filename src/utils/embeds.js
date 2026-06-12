const { EmbedBuilder } = require('discord.js');

// ─── Color Palette ───
const COLORS = {
  success: 0x00d26a,
  error: 0xff4757,
  info: 0x3b82f6,
  warning: 0xffa502,
  default: 0x2f3136,
  premium: 0xffd700,
  ai: 0x4285f4,
  fun: 0xff6b81,
  mod: 0xe74c3c,
  music: 0x1db954,
  game: 0x9b59b6,
  economy: 0xf1c40f,
  ticket: 0x00bcd4,
  owner: 0xff0055,
  admin: 0x3498db,
};

// ─── Category Icons ───
const ICONS = {
  success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️',
  ai: '🤖', fun: '🎮', mod: '🛡️', music: '🎵',
  game: '🎯', economy: '💰', ticket: '🎫', owner: '👑',
  admin: '⚙️', utility: '🔧', leveling: '📊', security: '🔒',
};

// ─── Standard Embeds ───
function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`${ICONS.success} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle(`${ICONS.error} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`${ICONS.info} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function warningEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(`${ICONS.warning} ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function modEmbed(title, description, moderator) {
  return new EmbedBuilder()
    .setColor(COLORS.mod)
    .setTitle(`${ICONS.mod} ${title}`)
    .setDescription(description)
    .addFields({ name: '👮 Moderator', value: moderator || 'Unknown', inline: true })
    .setTimestamp();
}

// ─── Panel Embed (for settings/dashboards) ───
function panelEmbed({ title, description, color, fields, footer, thumbnail, image, author }) {
  const embed = new EmbedBuilder()
    .setColor(color || COLORS.default)
    .setTitle(title || '')
    .setTimestamp();

  if (description) embed.setDescription(description);
  if (fields) {
    for (const f of fields) {
      embed.addFields({ name: f.name, value: f.value, inline: f.inline ?? false });
    }
  }
  if (footer) embed.setFooter({ text: footer });
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (author) embed.setAuthor({ name: author.name, iconURL: author.iconURL });
  return embed;
}

// ─── Status Card (for feature toggles) ───
function statusCard(title, modules) {
  const lines = modules.map(m => {
    const icon = m.enabled ? '✅' : '❌';
    const bar = m.enabled ? '🟢' : '🔴';
    return `${bar} **${m.name}** — ${icon} ${m.enabled ? 'Enabled' : 'Disabled'}`;
  });
  return new EmbedBuilder()
    .setColor(COLORS.admin)
    .setTitle(title)
    .setDescription(lines.join('\n'))
    .setTimestamp();
}

// ─── Progress Bar ───
function progressBar(current, max, filled = '🟩', empty = '⬛', length = 10) {
  const pct = Math.min(Math.round((current / max) * length), length);
  return filled.repeat(pct) + empty.repeat(length - pct);
}

// ─── Module Toggle Display ───
function moduleList(modules) {
  return modules.map(m => {
    const status = m.enabled ? '🟢 Enabled' : '🔴 Disabled';
    return `> ${m.emoji || '📦'} **${m.name}** — ${status}`;
  }).join('\n');
}

module.exports = {
  COLORS, ICONS,
  successEmbed, errorEmbed, infoEmbed, warningEmbed, modEmbed,
  panelEmbed, statusCard, progressBar, moduleList,
};
