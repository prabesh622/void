/** Check if bot's role is higher than target's */
function isRoleHigher(botMember, targetMember) {
  return botMember.roles.highest.position > targetMember.roles.highest.position;
}

/** Check if moderator's role is higher than target's */
function isModeratorHigher(modMember, targetMember) {
  return modMember.roles.highest.position > targetMember.roles.highest.position;
}

/** Parse duration string (e.g. "1h30m", "2d", "10m") to milliseconds */
function parseDuration(str) {
  const regex = /(\d+)([smhd])/g;
  let total = 0, match;
  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1]);
    switch (match[2]) {
      case 's': total += value * 1000; break;
      case 'm': total += value * 60000; break;
      case 'h': total += value * 3600000; break;
      case 'd': total += value * 86400000; break;
    }
  }
  return total > 0 ? total : null;
}

/** Format milliseconds to human-readable duration */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ') || '0s';
}

/** Format timestamp to relative time */
function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

module.exports = { isRoleHigher, isModeratorHigher, parseDuration, formatDuration, timeAgo };
