const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('suggestions', 'id', {
  status: 'pending',
  upvotes: 0,
  downvotes: 0,
});
