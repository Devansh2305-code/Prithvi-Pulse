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
  payment_uploaded        BOOLEAN DEFAULT false,
  payment_upi_id          TEXT,
  payment_timestamp       TIMESTAMPTZ,
  payment_verified        BOOLEAN DEFAULT false,
  payment_screenshot_url  TEXT,
  payment_notes           TEXT,
  verification_timestamp        TIMESTAMPTZ,
  verification_admin_notes      TEXT,
  confirmation_email_sent_at    TIMESTAMPTZ,
  reminder_email_sent_at        TIMESTAMPTZ,
  confirmation_receipt_number   TEXT,
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
  payment_uploaded        BOOLEAN DEFAULT false,
  payment_upi_id          TEXT,
  payment_timestamp       TIMESTAMPTZ,
  payment_verified        BOOLEAN DEFAULT false,
  payment_screenshot_url  TEXT,
  payment_notes           TEXT,
  verification_timestamp        TIMESTAMPTZ,
  verification_admin_notes      TEXT,
  confirmation_email_sent_at    TIMESTAMPTZ,
  reminder_email_sent_at        TIMESTAMPTZ,
  confirmation_receipt_number   TEXT,
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
  payment_uploaded        BOOLEAN DEFAULT false,
  payment_upi_id          TEXT,
  payment_timestamp       TIMESTAMPTZ,
  payment_verified        BOOLEAN DEFAULT false,
  payment_screenshot_url  TEXT,
  payment_notes           TEXT,
  verification_timestamp        TIMESTAMPTZ,
  verification_admin_notes      TEXT,
  confirmation_email_sent_at    TIMESTAMPTZ,
  reminder_email_sent_at        TIMESTAMPTZ,
  confirmation_receipt_number   TEXT,
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

-- ─── 5. STORAGE BUCKET FOR PAYMENT SCREENSHOTS ──
-- Run this to create the storage bucket (or create manually in Supabase Storage UI)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Allow anon to upload to payment-screenshots bucket
CREATE POLICY IF NOT EXISTS "Allow public upload - payment screenshots"
  ON storage.objects FOR INSERT
  TO anon WITH CHECK (bucket_id = 'payment-screenshots');

-- Allow anon to read from payment-screenshots bucket
CREATE POLICY IF NOT EXISTS "Allow public read - payment screenshots"
  ON storage.objects FOR SELECT
  TO anon USING (bucket_id = 'payment-screenshots');

-- ═══════════════════════════════════════════════
--  MIGRATION – run if tables already exist
-- ═══════════════════════════════════════════════
ALTER TABLE debate_registrations ADD COLUMN IF NOT EXISTS payment_uploaded       BOOLEAN DEFAULT false;
ALTER TABLE debate_registrations ADD COLUMN IF NOT EXISTS payment_upi_id         TEXT;
ALTER TABLE debate_registrations ADD COLUMN IF NOT EXISTS payment_timestamp      TIMESTAMPTZ;
ALTER TABLE debate_registrations ADD COLUMN IF NOT EXISTS payment_verified       BOOLEAN DEFAULT false;
ALTER TABLE debate_registrations ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;
ALTER TABLE debate_registrations ADD COLUMN IF NOT EXISTS payment_notes          TEXT;
ALTER TABLE debate_registrations ADD COLUMN IF NOT EXISTS verification_timestamp       TIMESTAMPTZ;
ALTER TABLE debate_registrations ADD COLUMN IF NOT EXISTS verification_admin_notes     TEXT;
ALTER TABLE debate_registrations ADD COLUMN IF NOT EXISTS confirmation_email_sent_at   TIMESTAMPTZ;
ALTER TABLE debate_registrations ADD COLUMN IF NOT EXISTS reminder_email_sent_at       TIMESTAMPTZ;
ALTER TABLE debate_registrations ADD COLUMN IF NOT EXISTS confirmation_receipt_number  TEXT;

ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS camera TEXT DEFAULT 'Not specified';
-- Backfill any existing NULL values
UPDATE photography_registrations SET camera = 'Not specified' WHERE camera IS NULL;
ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS confirmation_email_sent_at   TIMESTAMPTZ;
ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS reminder_email_sent_at       TIMESTAMPTZ;
ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS confirmation_receipt_number  TEXT;
ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS payment_uploaded       BOOLEAN DEFAULT false;
ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS payment_upi_id         TEXT;
ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS payment_timestamp      TIMESTAMPTZ;
ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS payment_verified       BOOLEAN DEFAULT false;
ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;
ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS payment_notes          TEXT;
ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS verification_timestamp       TIMESTAMPTZ;
ALTER TABLE photography_registrations ADD COLUMN IF NOT EXISTS verification_admin_notes     TEXT;

ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS participation_type      TEXT DEFAULT 'Solo';
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS partner_name            TEXT;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS partner_roll_no         TEXT;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS payment_uploaded        BOOLEAN DEFAULT false;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS payment_upi_id          TEXT;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS payment_timestamp       TIMESTAMPTZ;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS payment_verified        BOOLEAN DEFAULT false;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS payment_screenshot_url  TEXT;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS payment_notes           TEXT;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS verification_timestamp       TIMESTAMPTZ;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS verification_admin_notes     TEXT;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS confirmation_email_sent_at   TIMESTAMPTZ;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS reminder_email_sent_at       TIMESTAMPTZ;
ALTER TABLE poster_registrations ADD COLUMN IF NOT EXISTS confirmation_receipt_number  TEXT;

-- Add UPDATE policies if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'debate_registrations' AND policyname = 'Allow public update - debate'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public update - debate" ON debate_registrations FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'photography_registrations' AND policyname = 'Allow public update - photography'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public update - photography" ON photography_registrations FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'poster_registrations' AND policyname = 'Allow public update - poster'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public update - poster" ON poster_registrations FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ═══════════════════════════════════════════════
--  Done! Your tables are ready.
--  Go back to the browser and test a registration.
-- ═══════════════════════════════════════════════
