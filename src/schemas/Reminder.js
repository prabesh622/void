const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('reminders', 'id', {
  created_at: Date.now(),
});
