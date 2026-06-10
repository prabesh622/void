const express = require('express');
const router = express.Router();
const GuildSettings = require('../../schemas/GuildSettings');

function checkAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Toggle a feature
router.post('/:guildId/toggle', checkAuth, async (req, res) => {
  try {
    const { feature, enabled } = req.body;
    const guildId = req.params.guildId;

    const validFeatures = ['moderation.enabled', 'automod.enabled', 'welcome.enabled', 'logging.enabled',
      'tickets.enabled', 'leveling.enabled', 'economy.enabled', 'giveaways.enabled', 'ai.enabled',
      'security.enabled', 'verification.enabled', 'reactionRoles.enabled', 'customCommands.enabled', 'suggestions.enabled'];

    if (!validFeatures.includes(feature)) return res.status(400).json({ error: 'Invalid feature' });

    await GuildSettings.findOneAndUpdate({ guildId }, { [feature]: !!enabled }, { upsert: true });
    res.json({ success: true, feature, enabled: !!enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings
router.post('/:guildId/update', checkAuth, async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const updates = req.body;

    // Sanitize: only allow known fields
    const allowed = {};
    for (const [key, value] of Object.entries(updates)) {
      if (key.includes('.') && !key.startsWith('$')) allowed[key] = value;
    }

    if (Object.keys(allowed).length > 0) {
      await GuildSettings.findOneAndUpdate({ guildId }, allowed, { upsert: true });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get settings
router.get('/:guildId/settings', checkAuth, async (req, res) => {
  try {
    const guildId = req.params.guildId;
    let settings = await GuildSettings.findOne({ guildId });
    if (!settings) settings = await GuildSettings.create({ guildId });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
