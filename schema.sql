-- ============================================================================
-- NCDSB Italy Trip Portal — Supabase Schema
-- ============================================================================
-- This replaces localStorage with a real shared Postgres database.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- ============================================================================

-- Admin account (single admin per deployment, simple auth)
create table admin_account (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  email text,
  pass_hash text not null,
  created_at timestamptz default now()
);

-- Trips (one row per year/trip)
create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year int not null,
  cities text[] not null,           -- e.g. ['Rome','Sulmona','Chieti','Florence','Venice']
  is_live boolean default false,
  city_dates jsonb default '{}',    -- { "Rome": {"start":"2026-07-04","end":"2026-07-07"}, ... }
  setup_data jsonb default '{}',    -- hotel configuration per city (mirrors current app shape)
  created_at timestamptz default now()
);

-- Roster (students uploaded by admin, before they register accounts)
create table roster_students (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,               -- "Last, First"
  gender text not null default 'M',
  email text,
  passport text,
  allergies text,
  dob text,
  unique(trip_id, name)
);

-- Student accounts (created at registration time)
create table student_accounts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  email text not null,
  name text not null,
  pass_hash text not null,
  first_name text,
  last_name text,
  gender text,
  dob text,
  passport text,
  allergies text,
  registered_at timestamptz default now(),
  unique(trip_id, email)
);

-- Room selections — THE CRITICAL TABLE for concurrency safety.
-- One row per (trip, city, room_key, slot). A unique constraint on
-- (trip_id, city, room_key, slot) is what makes double-booking impossible:
-- if two students try to insert the same slot at the same time, Postgres
-- guarantees only ONE insert succeeds and the other gets a clean error back.
create table room_selections (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  city text not null,
  room_key text not null,           -- e.g. "h0_f1"
  slot text not null,               -- "A","B","C","D","E"
  student_name text not null,
  created_at timestamptz default now(),
  unique(trip_id, city, room_key, slot)   -- <-- THIS LINE prevents double-booking
);

-- Registration data (organizer's full application form export — reference only)
create table registration_data (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  display_name text,
  file_name text,
  imported_at timestamptz default now(),
  data jsonb not null               -- all spreadsheet columns stored as-is
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Since this app has no per-user backend auth (students log in with a simple
-- password check inside the app, not Supabase Auth), we use a permissive
-- policy scoped by the anon key, and rely on the app's own login logic for
-- access control. This matches the security model of the current app.

alter table admin_account enable row level security;
alter table trips enable row level security;
alter table roster_students enable row level security;
alter table student_accounts enable row level security;
alter table room_selections enable row level security;
alter table registration_data enable row level security;

create policy "Allow all access" on admin_account for all using (true) with check (true);
create policy "Allow all access" on trips for all using (true) with check (true);
create policy "Allow all access" on roster_students for all using (true) with check (true);
create policy "Allow all access" on student_accounts for all using (true) with check (true);
create policy "Allow all access" on room_selections for all using (true) with check (true);
create policy "Allow all access" on registration_data for all using (true) with check (true);

-- ============================================================================
-- REALTIME — lets the app subscribe to live changes to the room board
-- ============================================================================
alter publication supabase_realtime add table room_selections;
