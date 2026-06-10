const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('giveaways', 'id', {
  winnersCount: 1,
  entries: [],
  winners: [],
  status: 'running',
  requirements: { minLevel: 0, roleId: '' },
});
