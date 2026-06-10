const express = require('express');
const router = express.Router();
const GuildSettings = require('../../schemas/GuildSettings');

function checkAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect('/auth/login');
  next();
}

router.get('/', checkAuth, (req, res) => {
  // Get guilds where user has Manage Guild permission and bot is in
  const botGuilds = req.client.guilds.cache.map(g => g.id);
  const userGuilds = (req.user.guilds || []).filter(g => {
    const perms = BigInt(g.permissions || 0);
    const hasManage = (perms & BigInt(0x20)) !== BigInt(0);
    return hasManage && botGuilds.includes(g.id);
  });

  res.render('select-server', { user: req.user, guilds: userGuilds });
});

router.get('/:guildId', checkAuth, async (req, res) => {
  const guild = req.client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.redirect('/dashboard');

  let settings = await GuildSettings.findOne({ guildId: req.params.guildId });
  if (!settings) settings = await GuildSettings.create({ guildId: req.params.guildId });

  res.render('dashboard', { user: req.user, guild, settings });
});

router.get('/:guildId/:module', checkAuth, async (req, res) => {
  const guild = req.client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.redirect('/dashboard');

  let settings = await GuildSettings.findOne({ guildId: req.params.guildId });
  if (!settings) settings = await GuildSettings.create({ guildId: req.params.guildId });

  const moduleName = req.params.module;
  const validModules = ['moderation', 'welcome', 'logs', 'tickets', 'leveling', 'economy', 'giveaway', 'ai', 'security', 'automod', 'reaction-roles', 'verification', 'custom-commands', 'settings'];
  if (!validModules.includes(moduleName)) return res.redirect(`/dashboard/${req.params.guildId}`);

  res.render(`modules/${moduleName}`, { user: req.user, guild, settings });
});

module.exports = router;
