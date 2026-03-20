-- ============================================================
-- Pool Time Tracker — Supabase Schema
-- Output 1.3 | Run this in Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. TECHNICIANS
--    Mirrors the localStorage technician list.
--    PINs remain on-device only — not stored here.
-- ------------------------------------------------------------
create table if not exists public.technicians (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  display_name text generated always as (name) stored,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

comment on table public.technicians is
  'One row per field technician. PINs are stored locally only, never here.';

-- ------------------------------------------------------------
-- 2. SESSIONS
--    Each clock-in creates a session row.
--    clock_out_at is null while the tech is still clocked in.
-- ------------------------------------------------------------
create table if not exists public.sessions (
  id              uuid primary key default gen_random_uuid(),
  technician_id   uuid not null references public.technicians(id) on delete cascade,
  clock_in_at     timestamptz not null default now(),
  clock_out_at    timestamptz,
  duration_secs   integer generated always as (
                    extract(epoch from (coalesce(clock_out_at, now()) - clock_in_at))::integer
                  ) stored,
  created_at      timestamptz not null default now()
);

comment on table public.sessions is
  'Clock-in/out events. duration_secs is computed; clock_out_at null = active session.';

create index if not exists sessions_technician_id_idx on public.sessions(technician_id);
create index if not exists sessions_clock_in_at_idx   on public.sessions(clock_in_at desc);

-- ------------------------------------------------------------
-- 3. GPS_POINTS
--    One row per location ping (every 60 s while clocked in).
-- ------------------------------------------------------------
create table if not exists public.gps_points (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  technician_id uuid not null references public.technicians(id) on delete cascade,
  lat           double precision not null,
  lng           double precision not null,
  accuracy_m    real,
  address       text,              -- reverse-geocoded if available
  recorded_at   timestamptz not null default now()
);

comment on table public.gps_points is
  'GPS pings from technicians while clocked in. address is reverse-geocoded on the client.';

create index if not exists gps_points_session_id_idx     on public.gps_points(session_id);
create index if not exists gps_points_technician_id_idx  on public.gps_points(technician_id);
create index if not exists gps_points_recorded_at_idx    on public.gps_points(recorded_at desc);

-- ------------------------------------------------------------
-- 4. LIVE_POSITIONS view
--    Manager map queries this — latest GPS point per tech
--    for techs currently clocked in.
-- ------------------------------------------------------------
create or replace view public.live_positions as
select distinct on (gp.technician_id)
  gp.technician_id,
  t.name                              as technician_name,
  gp.lat,
  gp.lng,
  gp.address                          as current_address,
  gp.recorded_at                      as last_seen_at,
  s.id                                as session_id,
  s.clock_in_at,
  extract(epoch from (now() - s.clock_in_at))::integer
                                      as session_duration_secs
from public.gps_points gp
join public.technicians t  on t.id  = gp.technician_id
join public.sessions    s  on s.id  = gp.session_id
where s.clock_out_at is null          -- only active sessions
order by gp.technician_id, gp.recorded_at desc;

comment on view public.live_positions is
  'Latest GPS position for every currently clocked-in technician. Used by manager live map.';

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
--    Using anon key from the client app (no auth system).
--    Adjust to your security requirements.
-- ------------------------------------------------------------
alter table public.technicians  enable row level security;
alter table public.sessions     enable row level security;
alter table public.gps_points   enable row level security;

-- Allow anon read on all three tables (manager map reads freely)
create policy "anon_read_technicians"
  on public.technicians for select to anon using (true);

create policy "anon_read_sessions"
  on public.sessions for select to anon using (true);

create policy "anon_read_gps_points"
  on public.gps_points for select to anon using (true);

-- Allow anon insert for sessions and gps_points (techs write from app)
create policy "anon_insert_sessions"
  on public.sessions for insert to anon with check (true);

create policy "anon_update_sessions"
  on public.sessions for update to anon using (true);

create policy "anon_insert_gps_points"
  on public.gps_points for insert to anon with check (true);

-- Technicians table: only managed via Supabase dashboard / service role
-- (no anon insert — add techs manually or via a seeded migration below)

-- ------------------------------------------------------------
-- 6. REALTIME
--    Enable Supabase Realtime on gps_points so the manager
--    map updates without polling.
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.gps_points;
alter publication supabase_realtime add table public.sessions;

-- ------------------------------------------------------------
-- 7. OPTIONAL SEED — remove or edit before running in prod
-- ------------------------------------------------------------
-- insert into public.technicians (name) values
--   ('Alex Johnson'),
--   ('Maria Garcia'),
--   ('James Smith'),
--   ('Lisa Chen');
