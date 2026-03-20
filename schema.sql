-- ─────────────────────────────────────────────────────────────────────────────
-- Pool Time Tracker — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Time Entries ──────────────────────────────────────────────────────────────
-- One row per clock-in/clock-out pair per tech per day.
CREATE TABLE IF NOT EXISTS time_entries (
  id           BIGSERIAL PRIMARY KEY,
  tech         TEXT        NOT NULL,
  week_key     DATE        NOT NULL,          -- Monday of the week (YYYY-MM-DD)
  day_index    SMALLINT    NOT NULL,          -- 0=Sun … 6=Sat
  entry_in     TIMESTAMPTZ NOT NULL,
  entry_out    TIMESTAMPTZ,                   -- NULL while clocked in
  duration_ms  BIGINT      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tech, week_key, day_index, entry_in)
);

-- ── GPS Points ────────────────────────────────────────────────────────────────
-- One row per GPS sample captured while a tech is clocked in.
CREATE TABLE IF NOT EXISTS gps_points (
  id           BIGSERIAL PRIMARY KEY,
  tech         TEXT        NOT NULL,
  week_key     DATE        NOT NULL,
  day_index    SMALLINT    NOT NULL,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  accuracy     REAL,                          -- metres
  captured_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Week Submissions ──────────────────────────────────────────────────────────
-- One row per tech per week when they hit "Submit Week".
CREATE TABLE IF NOT EXISTS week_submissions (
  id           BIGSERIAL PRIMARY KEY,
  tech         TEXT        NOT NULL,
  week_key     DATE        NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlocked_at  TIMESTAMPTZ,                   -- set if manager unlocks
  UNIQUE (tech, week_key)
);

-- ── Day Flags ─────────────────────────────────────────────────────────────────
-- Tracks whether a tech flagged a specific day for manager review.
CREATE TABLE IF NOT EXISTS day_flags (
  id           BIGSERIAL PRIMARY KEY,
  tech         TEXT        NOT NULL,
  week_key     DATE        NOT NULL,
  day_index    SMALLINT    NOT NULL,
  flagged      BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tech, week_key, day_index)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes — keeps queries fast even with months of data
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_entries_tech_week   ON time_entries  (tech, week_key);
CREATE INDEX IF NOT EXISTS idx_gps_tech_week       ON gps_points    (tech, week_key);
CREATE INDEX IF NOT EXISTS idx_submissions_week    ON week_submissions (week_key);
CREATE INDEX IF NOT EXISTS idx_flags_tech_week     ON day_flags     (tech, week_key);

-- ─────────────────────────────────────────────────────────────────────────────
-- auto-update updated_at timestamps
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER flags_updated_at
  BEFORE UPDATE ON day_flags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- The app uses the anon key — keep it simple with open policies for now.
-- For production hardening, replace these with per-user policies.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE time_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_points       ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_flags        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON time_entries     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON gps_points       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON week_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON day_flags        FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Realtime on all tables
-- Run these in the Supabase Dashboard → Database → Replication tab too.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE time_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE week_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE day_flags;
-- Note: gps_points realtime is handled via Broadcast channel (ephemeral),
-- not table replication, to avoid DB load from high-frequency GPS writes.

-- ─────────────────────────────────────────────────────────────────────────────
-- Techs table (Admin screen — add/remove techs without code changes)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS techs (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT        NOT NULL UNIQUE,
  email      TEXT,                            -- for weekly summary emails
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_techs_active ON techs (active);

ALTER TABLE techs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON techs FOR ALL USING (true) WITH CHECK (true);

-- Seed the default 12 techs (safe to run multiple times — ON CONFLICT DO NOTHING)
INSERT INTO techs (name) VALUES
  ('Alex Rivera'), ('Brandon Cole'), ('Casey Nguyen'), ('Dana Torres'),
  ('Eli Santos'),  ('Fiona Park'),   ('Gabe Morales'), ('Hailey Kim'),
  ('Ivan Cruz'),   ('Jess Webb'),    ('Kyle Hunt'),    ('Luna Reyes')
ON CONFLICT (name) DO NOTHING;
