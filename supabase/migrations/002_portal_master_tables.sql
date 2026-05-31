-- =====================================================================
-- 002_portal_master_tables.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   Organisation + operational location master data:
--     portal_billing_facilities (HMC / SMC invoice identities)
--     portal_locations          (external clinics + main branches)
--     portal_rooms              (room board for Al-Kawther + Sheraton)
--   Plus reference seed rows for the 8 configured operational locations
--   already used by the deployed frontend, and Rooms 01–15 for both
--   main branches. These are OPERATIONAL SETUP rows, not patient data.
--
-- AFFECTED OBJECTS
--   tables (new): portal_billing_facilities, portal_locations, portal_rooms
--   RLS: ENABLED on all three at creation time (deny-all until 009 policies)
--   seeds: 2 billing facilities, 8 locations, 30 rooms (15×2 branches)
--
-- SAFETY
--   Additive. New `portal_`-prefixed tables in public. RLS enabled before
--   any policy exists → no anon/authenticated access window. Seeds are
--   non-PHI configuration data, idempotent via ON CONFLICT.
--
-- ROLLBACK
--   drop table if exists public.portal_rooms cascade;
--   drop table if exists public.portal_locations cascade;
--   drop table if exists public.portal_billing_facilities cascade;
--
-- VERIFICATION
--   select code from public.portal_billing_facilities order by code;     -- HMC, SMC
--   select count(*) from public.portal_locations;                         -- 8
--   select location_id, count(*) from public.portal_rooms group by 1;     -- 15 each
-- =====================================================================

-- ---------------------------------------------------------------------
-- portal_billing_facilities — legal invoice identities (HMC / SMC)
-- ---------------------------------------------------------------------
create table if not exists public.portal_billing_facilities (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.portal_billing_facilities enable row level security;
drop trigger if exists trg_portal_billing_facilities_updated on public.portal_billing_facilities;
create trigger trg_portal_billing_facilities_updated
  before update on public.portal_billing_facilities
  for each row execute function public.portal_set_updated_at();

-- ---------------------------------------------------------------------
-- portal_locations — all operational clinics and branches
-- ---------------------------------------------------------------------
create table if not exists public.portal_locations (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  name            text not null,
  location_type   portal_location_type not null,
  active          boolean not null default true,
  allows_expenses boolean not null default false,
  has_room_board  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.portal_locations enable row level security;
drop trigger if exists trg_portal_locations_updated on public.portal_locations;
create trigger trg_portal_locations_updated
  before update on public.portal_locations
  for each row execute function public.portal_set_updated_at();

-- ---------------------------------------------------------------------
-- portal_rooms — room board (Al-Kawther + Sheraton only)
-- ---------------------------------------------------------------------
create table if not exists public.portal_rooms (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.portal_locations(id) on delete cascade,
  room_code    text not null,
  room_name    text not null,
  active       boolean not null default true,
  sort_order   integer,
  unique (location_id, room_code)
);
alter table public.portal_rooms enable row level security;

-- =====================================================================
-- SEED — configuration data (non-PHI)
-- =====================================================================

insert into public.portal_billing_facilities (code, name) values
  ('HMC', 'Hurghada Medical Center'),
  ('SMC', 'Sahl Hasheesh Medical Centre')
on conflict (code) do nothing;

-- Operational locations mirror the deployed frontend's configured list.
insert into public.portal_locations (code, name, location_type, allows_expenses, has_room_board) values
  ('tropitel',      'Tropitel Clinic',        'external_clinic', true,  false),
  ('romance',       'Romance Clinic',         'external_clinic', true,  false),
  ('sahl_hasheesh', 'Sahl Hasheesh Clinics',  'external_clinic', true,  false),
  ('mamsha',        'Mamsha Clinic',          'external_clinic', true,  false),
  ('pharaoh',       'Pharaoh Clinic',         'external_clinic', true,  false),
  ('menamark',      'Menamark Clinic',        'external_clinic', true,  false),
  ('al_kawther',    'Al-Kawther Branch',      'main_branch',     false, true),
  ('sheraton',      'Sheraton Branch',        'main_branch',     false, true)
on conflict (code) do nothing;

-- Rooms 01–15 for the two main branches only.
insert into public.portal_rooms (location_id, room_code, room_name, sort_order)
select l.id,
       'R' || lpad(g::text, 2, '0'),
       'Room ' || lpad(g::text, 2, '0'),
       g
from public.portal_locations l
cross join generate_series(1, 15) g
where l.code in ('al_kawther', 'sheraton')
on conflict (location_id, room_code) do nothing;
