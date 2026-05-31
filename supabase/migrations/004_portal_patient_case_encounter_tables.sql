-- =====================================================================
-- 004_portal_patient_case_encounter_tables.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   Patient master, server-side reference counters, operational cases,
--   encounters (visit/session/admission), and tourist travel dates.
--
-- AFFECTED OBJECTS
--   tables (new):
--     portal_patients
--     portal_case_reference_counters
--     portal_cases
--     portal_encounters
--     portal_patient_travel_dates
--   RLS: ENABLED on all at creation (deny-all until 009).
--
-- KEY RULES
--   * Age is NEVER stored — computed from date_of_birth + encounter date
--     in views/queries/frontend. Only date_of_birth is persisted.
--   * our_ref is UNIQUE and nullable initially. Final formatted generation
--     stays PROVISIONAL (see 008 + PORTAL_REFERENCE_FORMAT_EVIDENCE.md);
--     the guaranteed identity is the uuid PK.
--   * Patient travel dates are NOT encounter check-in/out times.
--
-- SAFETY
--   Additive. No PHI imported (test seed only, in 010). RLS enabled before
--   any policy → closed by default.
--
-- ROLLBACK
--   drop table if exists public.portal_patient_travel_dates cascade;
--   drop table if exists public.portal_encounters cascade;
--   drop table if exists public.portal_cases cascade;
--   drop table if exists public.portal_case_reference_counters cascade;
--   drop table if exists public.portal_patients cascade;
--
-- VERIFICATION
--   select count(*) from public.portal_patients;            -- 0 until 010
--   select indexname from pg_indexes where tablename='portal_cases';
-- =====================================================================

-- ---------------------------------------------------------------------
-- portal_patients — patient master (PHI). full_name maintained from parts.
-- ---------------------------------------------------------------------
create table if not exists public.portal_patients (
  id                 uuid primary key default gen_random_uuid(),
  first_name         text not null,
  last_name          text not null,
  full_name          text generated always as (btrim(first_name || ' ' || last_name)) stored,
  date_of_birth      date not null,
  gender             portal_gender not null,
  nationality        text,
  phone_country_code text,
  phone_number       text,
  email              text,
  postal_code        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id)
);
alter table public.portal_patients enable row level security;
drop trigger if exists trg_portal_patients_updated on public.portal_patients;
create trigger trg_portal_patients_updated
  before update on public.portal_patients
  for each row execute function public.portal_set_updated_at();

-- Duplicate-detection support (no automatic merging in this sprint).
create index if not exists ix_portal_patients_phone on public.portal_patients (phone_number);
create index if not exists ix_portal_patients_email on public.portal_patients (lower(email));
create index if not exists ix_portal_patients_postal on public.portal_patients (postal_code);
create index if not exists ix_portal_patients_name_dob on public.portal_patients (lower(full_name), date_of_birth);

-- ---------------------------------------------------------------------
-- portal_case_reference_counters — server-side sequencing source
-- counter_key examples (provisional): 'HMC:2026', 'SMC:2752026'
-- ---------------------------------------------------------------------
create table if not exists public.portal_case_reference_counters (
  counter_key text primary key,
  next_number bigint not null default 1,
  updated_at  timestamptz not null default now()
);
alter table public.portal_case_reference_counters enable row level security;

-- ---------------------------------------------------------------------
-- portal_cases — one operational patient case
-- ---------------------------------------------------------------------
create table if not exists public.portal_cases (
  id                     uuid primary key default gen_random_uuid(),
  our_ref                text unique,                       -- nullable; provisional generator
  patient_id             uuid not null references public.portal_patients(id),
  registered_location_id uuid not null references public.portal_locations(id),
  current_location_id    uuid not null references public.portal_locations(id),
  billing_facility_id    uuid references public.portal_billing_facilities(id),
  route                  portal_route_type not null default 'direct',
  financial_type         portal_financial_type not null default 'pending',
  encounter_pattern      portal_encounter_pattern not null,
  treatment_mode         portal_treatment_mode,             -- main branches only
  operational_status     portal_operational_status not null default 'open',
  visit_date             date not null,
  visit_time             time,
  hotel_or_location      text,
  hotel_room_number      text,
  center_room_id         uuid references public.portal_rooms(id),
  short_clinical_note    text,
  free_reason            text,
  created_by             uuid not null references auth.users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  closed_at              timestamptz
);
alter table public.portal_cases enable row level security;
drop trigger if exists trg_portal_cases_updated on public.portal_cases;
create trigger trg_portal_cases_updated
  before update on public.portal_cases
  for each row execute function public.portal_set_updated_at();

create index if not exists ix_portal_cases_reg_loc_date on public.portal_cases (registered_location_id, visit_date);
create index if not exists ix_portal_cases_cur_loc_date on public.portal_cases (current_location_id, visit_date);
create index if not exists ix_portal_cases_financial on public.portal_cases (financial_type);
create index if not exists ix_portal_cases_status on public.portal_cases (operational_status);
create index if not exists ix_portal_cases_patient on public.portal_cases (patient_id);
-- our_ref already has a UNIQUE constraint/index from the column definition.

-- ---------------------------------------------------------------------
-- portal_encounters — visit / session / admission timing under a case
-- ---------------------------------------------------------------------
create table if not exists public.portal_encounters (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.portal_cases(id) on delete cascade,
  encounter_type portal_encounter_type not null,
  sequence_no    integer not null,
  check_in_at    timestamptz not null,
  check_out_at   timestamptz,
  status         portal_encounter_status not null default 'active',
  room_id        uuid references public.portal_rooms(id),
  notes          text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (case_id, sequence_no)
);
alter table public.portal_encounters enable row level security;
drop trigger if exists trg_portal_encounters_updated on public.portal_encounters;
create trigger trg_portal_encounters_updated
  before update on public.portal_encounters
  for each row execute function public.portal_set_updated_at();

create index if not exists ix_portal_encounters_case on public.portal_encounters (case_id, sequence_no);

-- ---------------------------------------------------------------------
-- portal_patient_travel_dates — tourist arrival/departure (NOT encounter)
-- Validation (arrival <= today <= departure when entered) is enforced in
-- the API/functions layer, not as a CURRENT_DATE check constraint (which
-- would be non-immutable). Documented in PORTAL_BACKEND_ARCHITECTURE.md.
-- ---------------------------------------------------------------------
create table if not exists public.portal_patient_travel_dates (
  case_id                  uuid primary key references public.portal_cases(id) on delete cascade,
  arrival_to_egypt_date    date,
  departure_from_egypt_date date,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint chk_portal_travel_order
    check (arrival_to_egypt_date is null
           or departure_from_egypt_date is null
           or arrival_to_egypt_date <= departure_from_egypt_date)
);
alter table public.portal_patient_travel_dates enable row level security;
drop trigger if exists trg_portal_travel_updated on public.portal_patient_travel_dates;
create trigger trg_portal_travel_updated
  before update on public.portal_patient_travel_dates
  for each row execute function public.portal_set_updated_at();

-- ---------------------------------------------------------------------
-- portal_transfers — case movement external clinic → destination branch.
-- The case + our_ref + original hotel/room stay on portal_cases; the
-- receiving branch assigns a Center Room separately (portal_room_assignments).
-- ---------------------------------------------------------------------
create table if not exists public.portal_transfers (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.portal_cases(id) on delete cascade,
  from_location_id uuid not null references public.portal_locations(id),
  to_location_id   uuid not null references public.portal_locations(id),
  transfer_status  portal_transfer_status not null default 'requested',
  requested_at     timestamptz not null default now(),
  received_at      timestamptz,
  requested_by     uuid references auth.users(id),
  received_by      uuid references auth.users(id),
  transfer_note    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.portal_transfers enable row level security;
drop trigger if exists trg_portal_transfers_updated on public.portal_transfers;
create trigger trg_portal_transfers_updated
  before update on public.portal_transfers
  for each row execute function public.portal_set_updated_at();

create index if not exists ix_portal_transfers_to_status on public.portal_transfers (to_location_id, transfer_status);
create index if not exists ix_portal_transfers_case on public.portal_transfers (case_id);

-- ---------------------------------------------------------------------
-- portal_room_assignments — occupancy history. A room cannot have two
-- active occupants (partial unique index below).
-- ---------------------------------------------------------------------
create table if not exists public.portal_room_assignments (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.portal_cases(id) on delete cascade,
  room_id     uuid not null references public.portal_rooms(id),
  assigned_at timestamptz not null default now(),
  released_at timestamptz,
  status      portal_room_assignment_status not null default 'occupied',
  assigned_by uuid references auth.users(id),
  released_by uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
alter table public.portal_room_assignments enable row level security;

-- At most one ACTIVE (occupied) assignment per room.
create unique index if not exists ux_portal_room_active_occupant
  on public.portal_room_assignments (room_id)
  where status = 'occupied';
create index if not exists ix_portal_room_assign_case on public.portal_room_assignments (case_id);
