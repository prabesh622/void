const { createTableWrapper } = require('../lib/compat');

module.exports = createTableWrapper('reaction_roles', 'id', {
  type: 'button',
  roles: [],
  multiSelect: true,
  maxRoles: 0,
});
