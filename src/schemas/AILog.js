const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('ai_logs', 'id', {
  userMessage: '',
  aiResponse: '',
  personality: 'friendly',
  tokens: 0,
  timestamp: Date.now(),
});
