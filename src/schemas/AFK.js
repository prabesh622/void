const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('afk', 'id', {
  reason: 'AFK',
  since: Date.now(),
});
