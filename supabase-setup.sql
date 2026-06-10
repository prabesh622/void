-- =============================================
-- Void Bot - Supabase Table Creation Script
-- Run this in your Supabase SQL Editor to create all required tables.
-- =============================================

-- 1. Guild Settings (master config - JSONB for nested settings)
CREATE TABLE IF NOT EXISTS guild_settings (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guild_settings_guild_id ON guild_settings(guild_id);

-- 2. Warnings (moderation logs)
CREATE TABLE IF NOT EXISTS warnings (
  id BIGSERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  reason TEXT DEFAULT 'No reason provided',
  "moderatorId" TEXT NOT NULL,
  type TEXT DEFAULT 'warn',
  timestamp BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warnings_guild_id ON warnings("guildId");
CREATE INDEX IF NOT EXISTS idx_warnings_user_id ON warnings("userId");

-- 3. Levels (XP and leveling)
CREATE TABLE IF NOT EXISTS levels (
  id BIGSERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 0,
  "voiceXp" INTEGER DEFAULT 0,
  prestige INTEGER DEFAULT 0,
  "totalMessages" INTEGER DEFAULT 0,
  "lastXpAt" BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("guildId", "userId")
);
CREATE INDEX IF NOT EXISTS idx_levels_guild_id ON levels("guildId");

-- 4. Economy (wallet/bank)
CREATE TABLE IF NOT EXISTS economy (
  id BIGSERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  balance INTEGER DEFAULT 0,
  bank INTEGER DEFAULT 0,
  "lastDaily" BIGINT DEFAULT 0,
  "lastWork" BIGINT DEFAULT 0,
  "totalEarned" INTEGER DEFAULT 0,
  "totalSpent" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("guildId", "userId")
);
CREATE INDEX IF NOT EXISTS idx_economy_guild_id ON economy("guildId");

-- 5. Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "channelId" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "claimedBy" TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'open',
  "createdAt" BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  "closedAt" BIGINT,
  transcript TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tickets_guild_id ON tickets("guildId");

-- 6. Giveaways
CREATE TABLE IF NOT EXISTS giveaways (
  id BIGSERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL UNIQUE,
  "hostId" TEXT NOT NULL,
  prize TEXT NOT NULL,
  "winnersCount" INTEGER DEFAULT 1,
  entries JSONB DEFAULT '[]',
  winners JSONB DEFAULT '[]',
  "endAt" BIGINT NOT NULL,
  status TEXT DEFAULT 'running',
  requirements JSONB DEFAULT '{"minLevel": 0, "roleId": ""}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_giveaways_guild_id ON giveaways("guildId");
CREATE INDEX IF NOT EXISTS idx_giveaways_status ON giveaways(status);

-- 7. Logs (moderation/action logs)
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  type TEXT NOT NULL,
  action TEXT DEFAULT '',
  "userId" TEXT DEFAULT '',
  "targetId" TEXT DEFAULT '',
  "channelId" TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  details JSONB DEFAULT '{}',
  timestamp BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_logs_guild_id ON logs("guildId");

-- 8. Custom Commands
CREATE TABLE IF NOT EXISTS custom_commands (
  id BIGSERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  trigger TEXT NOT NULL,
  response TEXT NOT NULL,
  "isRegex" BOOLEAN DEFAULT FALSE,
  "isEmbed" BOOLEAN DEFAULT FALSE,
  "embedColor" TEXT DEFAULT '#3b82f6',
  cooldown INTEGER DEFAULT 5,
  enabled BOOLEAN DEFAULT TRUE,
  "createdBy" TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("guildId", trigger)
);
CREATE INDEX IF NOT EXISTS idx_custom_commands_guild_id ON custom_commands("guildId");

-- 9. Reaction Roles
CREATE TABLE IF NOT EXISTS reaction_roles (
  id BIGSERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL UNIQUE,
  type TEXT DEFAULT 'button',
  roles JSONB DEFAULT '[]',
  "multiSelect" BOOLEAN DEFAULT TRUE,
  "maxRoles" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reaction_roles_guild_id ON reaction_roles("guildId");

-- 10. AI Logs
CREATE TABLE IF NOT EXISTS ai_logs (
  id BIGSERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "userMessage" TEXT DEFAULT '',
  "aiResponse" TEXT DEFAULT '',
  personality TEXT DEFAULT 'friendly',
  tokens INTEGER DEFAULT 0,
  timestamp BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_logs_guild_id ON ai_logs("guildId");

-- 11. Suggestions
CREATE TABLE IF NOT EXISTS suggestions (
  id BIGSERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suggestions_guild_id ON suggestions("guildId");

-- 12. Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id BIGSERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  message TEXT NOT NULL,
  "remindAt" BIGINT NOT NULL,
  "createdAt" BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders("userId");
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders("remindAt");

-- 13. AFK
CREATE TABLE IF NOT EXISTS afk (
  id BIGSERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  reason TEXT DEFAULT 'AFK',
  since BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  UNIQUE("guildId", "userId")
);

-- =============================================
-- Disable RLS (Row Level Security) for bot access
-- The bot uses the service role key or anon key with full access.
-- Enable RLS and add policies if you want to restrict access.
-- =============================================
ALTER TABLE guild_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE warnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE economy DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE giveaways DISABLE ROW LEVEL SECURITY;
ALTER TABLE logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE custom_commands DISABLE ROW LEVEL SECURITY;
ALTER TABLE reaction_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE afk DISABLE ROW LEVEL SECURITY;
