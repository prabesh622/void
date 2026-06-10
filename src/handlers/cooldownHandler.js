/** Per-user per-command cooldown tracking */
const cooldowns = new Map();

/** Check if a user is on cooldown. Returns remaining ms or 0 */
function checkCooldown(userId, commandName, cooldownSeconds = 3) {
  const key = `${userId}-${commandName}`;
  const now = Date.now();
  const expiresAt = cooldowns.get(key) || 0;
  if (now < expiresAt) return expiresAt - now;
  cooldowns.set(key, now + cooldownSeconds * 1000);
  return 0;
}

/** Clear all cooldowns */
function clearCooldowns() {
  cooldowns.clear();
}

module.exports = { checkCooldown, clearCooldowns };
