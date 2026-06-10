const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('economy', 'id', {
  balance: 0,
  bank: 0,
  lastDaily: 0,
  lastWork: 0,
  totalEarned: 0,
  totalSpent: 0,
});
