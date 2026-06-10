const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('tickets', 'id', {
  claimedBy: '',
  category: 'general',
  status: 'open',
  created_at: Date.now(),
  transcript: '',
});
