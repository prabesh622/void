// Legacy file — now redirects to SQLite database
const { db } = require('./database');
module.exports = { db, supabase: null }; // supabase is null; use db directly
