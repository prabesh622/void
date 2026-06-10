const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('logs', 'id', {
  action: '',
  userId: '',
  targetId: '',
  channelId: '',
  reason: '',
  details: {},
  timestamp: Date.now(),
});
