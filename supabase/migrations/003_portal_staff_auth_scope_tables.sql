-- =====================================================================
-- 003_portal_staff_auth_scope_tables.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   Staff directory, staff↔location assignments, application user
--   profiles (linked to Supabase auth.users), and per-user location
--   scopes that drive RLS.
--
-- AFFECTED OBJECTS
--   tables (new):
--     portal_staff
--     portal_staff_location_assignments
--     portal_user_profiles            (PK = auth.users.id)
--     portal_user_location_scopes
--   RLS: ENABLED on all at creation (deny-all until 009).
--
-- SAFETY
--   Additive. No real employee data imported (seeds live in 010, test-only).
--   No plaintext-password column anywhere — authentication is delegated to
--   Supabase Auth (auth.users). portal_user_profiles only EXTENDS auth.users.
--
-- ROLLBACK
--   drop table if exists public.portal_user_location_scopes cascade;
--   drop table if exists public.portal_user_profiles cascade;
--   drop table if exists public.portal_staff_location_assignments cascade;
--   drop table if exists public.portal_staff cascade;
--
-- VERIFICATION
--   select count(*) from public.portal_staff;            -- 0 until 010 test seed
--   \d+ public.portal_user_profiles                       -- PK references auth.users
-- =====================================================================

-- ---------------------------------------------------------------------
-- portal_staff — employee master directory
-- ---------------------------------------------------------------------
create table if not exists public.portal_staff (
  id          uuid primary key default gen_random_uuid(),
  staff_code  text unique not null,
  full_name   text not null,
  staff_role  portal_staff_role not null,
  phone       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.portal_staff enable row level security;
drop trigger if exists trg_portal_staff_updated on public.portal_staff;
create trigger trg_portal_staff_updated
  before update on public.portal_staff
  for each row execute function public.portal_set_updated_at();

-- ---------------------------------------------------------------------
-- portal_staff_location_assignments — who works where (time-bounded)
-- Required so attendance lists only staff from the user's location.
-- ---------------------------------------------------------------------
create table if not exists public.portal_staff_location_assignments (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references public.portal_staff(id) on delete cascade,
  location_id     uuid not null references public.portal_locations(id) on delete cascade,
  assignment_role portal_assignment_role not null,
  valid_from      date,
  valid_to        date,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
alter table public.portal_staff_location_assignments enable row level security;

create index if not exists ix_portal_staff_assign_location
  on public.portal_staff_location_assignments (location_id, assignment_role, active);
create index if not exists ix_portal_staff_assign_staff
  on public.portal_staff_location_assignments (staff_id, active);
-- One active assignment of a given role per staff per location.
create unique index if not exists ux_portal_staff_assign_active
  on public.portal_staff_location_assignments (staff_id, location_id, assignment_role)
  where active;

-- ---------------------------------------------------------------------
-- portal_user_profiles — app user profile extending Supabase Auth
-- ---------------------------------------------------------------------
create table if not exists public.portal_user_profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null,
  role            portal_role not null,
  active          boolean not null default true,
  linked_staff_id uuid references public.portal_staff(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.portal_user_profiles enable row level security;
drop trigger if exists trg_portal_user_profiles_updated on public.portal_user_profiles;
create trigger trg_portal_user_profiles_updated
  before update on public.portal_user_profiles
  for each row execute function public.portal_set_updated_at();

-- ---------------------------------------------------------------------
-- portal_user_location_scopes — which location(s) a clinic/branch user sees.
-- Admin needs no scope row (global by role).
-- ---------------------------------------------------------------------
create table if not exists public.portal_user_location_scopes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.portal_locations(id) on delete cascade,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id, location_id)
);
alter table public.portal_user_location_scopes enable row level security;

create index if not exists ix_portal_user_scope_user
  on public.portal_user_location_scopes (user_id, active);
