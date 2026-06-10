/** Global cooldown service for features (AI, custom commands, etc.) */
const featureCooldowns = new Map();

function checkFeatureCooldown(key, cooldownMs = 5000) {
  const now = Date.now();
  const expiresAt = featureCooldowns.get(key) || 0;
  if (now < expiresAt) return expiresAt - now;
  featureCooldowns.set(key, now + cooldownMs);
  return 0;
}

module.exports = { checkFeatureCooldown };
