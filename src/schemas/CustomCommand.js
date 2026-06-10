const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('custom_commands', 'id', {
  isRegex: false,
  isEmbed: false,
  embedColor: '#3b82f6',
  cooldown: 5,
  enabled: true,
  createdBy: '',
});
