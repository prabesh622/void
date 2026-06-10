const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('warnings', 'id', {
  reason: 'No reason provided',
  type: 'warn',
  timestamp: Date.now(),
});
