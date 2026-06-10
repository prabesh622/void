const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('levels', 'id', {
  xp: 0,
  level: 0,
  voiceXp: 0,
  prestige: 0,
  totalMessages: 0,
  lastXpAt: 0,
});
