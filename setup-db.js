require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase PostgreSQL connection string
// Format: postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('Could not extract project ref from SUPABASE_URL');
  process.exit(1);
}

const connectionString = `postgresql://postgres:${SUPABASE_KEY}@db.${projectRef}.supabase.co:5432/postgres`;

console.log(`Connecting to Supabase PostgreSQL at db.${projectRef}.supabase.co...`);

async function setup() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL!');

    // Read and execute the SQL setup file
    const sqlFile = path.join(__dirname, 'supabase-setup.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    
    console.log('Running supabase-setup.sql...');
    await client.query(sql);
    console.log('All tables created successfully!');
    
    // Disable RLS
    const tables = ['guild_settings','warnings','levels','economy','tickets','giveaways','logs','custom_commands','reaction_roles','ai_logs','suggestions','reminders','afk'];
    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
        console.log(`  RLS disabled for ${table}`);
      } catch (e) {
        console.warn(`  Warning: Could not disable RLS for ${table}: ${e.message}`);
      }
    }
    
    console.log('\nDatabase setup complete!');
  } catch (err) {
    console.error('Error:', err.message);
    console.log('\nIf connection failed, you may need your Supabase DATABASE PASSWORD.');
    console.log('Go to: Supabase Dashboard > Settings > Database > Connection string');
    console.log('Then update .env with: SUPABASE_DB_PASSWORD=your_password');
  } finally {
    await client.end();
  }
}

setup();
