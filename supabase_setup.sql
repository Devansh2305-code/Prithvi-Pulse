-- ═══════════════════════════════════════════════
--  PRITHIVI PULSE – Supabase Database Setup
--  Run this entire script once in the Supabase
--  SQL Editor (supabase.com → your project →
--  SQL Editor → New query → paste → Run)
-- ═══════════════════════════════════════════════

-- ─── 1. DEBATE REGISTRATIONS ────────────────────
CREATE TABLE IF NOT EXISTS debate_registrations (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  contact         TEXT NOT NULL,
  email           TEXT NOT NULL,
  university      TEXT NOT NULL,
  roll_no         TEXT NOT NULL,
  stance          TEXT NOT NULL,
  experience      TEXT,
  registered_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. PHOTOGRAPHY REGISTRATIONS ───────────────
CREATE TABLE IF NOT EXISTS photography_registrations (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  contact         TEXT NOT NULL,
  email           TEXT NOT NULL,
  university      TEXT NOT NULL,
  roll_no         TEXT NOT NULL,
  camera          TEXT,
  theme           TEXT,
  experience      TEXT,
  registered_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. POSTER REGISTRATIONS ────────────────────
CREATE TABLE IF NOT EXISTS poster_registrations (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  contact         TEXT NOT NULL,
  email           TEXT NOT NULL,
  university      TEXT NOT NULL,
  roll_no         TEXT NOT NULL,
  medium          TEXT NOT NULL,
  concept         TEXT,
  participation_type      TEXT DEFAULT 'Solo',
  partner_name            TEXT,
  partner_roll_no         TEXT,
  registered_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. ROW LEVEL SECURITY ───────────────────────
-- Enable RLS on all tables
ALTER TABLE debate_registrations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE photography_registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE poster_registrations       ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon) to INSERT (public registration)
CREATE POLICY "Allow public insert - debate"
  ON debate_registrations FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Allow public insert - photography"
  ON photography_registrations FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Allow public insert - poster"
  ON poster_registrations FOR INSERT
  TO anon WITH CHECK (true);

-- Allow anyone (anon) to SELECT (admin dashboard reads)
-- NOTE: For production, replace with authenticated role
CREATE POLICY "Allow public select - debate"
  ON debate_registrations FOR SELECT
  TO anon USING (true);

CREATE POLICY "Allow public select - photography"
  ON photography_registrations FOR SELECT
  TO anon USING (true);

CREATE POLICY "Allow public select - poster"
  ON poster_registrations FOR SELECT
  TO anon USING (true);

-- Allow anon to UPDATE payment verification fields (admin dashboard)
-- NOTE: The server-side service key bypasses RLS. These policies allow
--       frontend-only deployments where the backend isn't running.
CREATE POLICY "Allow public update - debate"
  ON debate_registrations FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow public update - photography"
  ON photography_registrations FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow public update - poster"
  ON poster_registrations FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════
--  Done! Your tables are ready.
-- ═══════════════════════════════════════════════
