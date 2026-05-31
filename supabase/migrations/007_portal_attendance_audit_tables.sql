-- =====================================================================
-- 007_portal_attendance_audit_tables.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   Attendance (nurse shifts + doctor daily duty) and the append-only
--   audit log.
--
-- AFFECTED OBJECTS
--   tables (new):
--     portal_nurse_shifts
--     portal_doctor_daily_duty
--     portal_audit_log         (append-only; no UPDATE/DELETE for anyone)
--   RLS: ENABLED on all at creation (deny-all until 009).
--
-- RULES (validated in 008 record_attendance function)
--   * Nurse/doctor must be an ACTIVE staff member assigned to the same
--     location (portal_staff_location_assignments).
--   * Multiple nurses per clinic/day allowed; doctor duty is per-day,
--     no clock-in/out, multiple doctors not structurally prevented.
--
-- ROLLBACK
--   drop table if exists public.portal_audit_log cascade;
--   drop table if exists public.portal_doctor_daily_duty cascade;
--   drop table if exists public.portal_nurse_shifts cascade;
--
-- VERIFICATION
--   select relrowsecurity from pg_class where relname='portal_audit_log';  -- t
-- =====================================================================

-- ---------------------------------------------------------------------
-- portal_nurse_shifts — clock-in/out, one or more nurses per clinic/date
-- ---------------------------------------------------------------------
create table if not exists public.portal_nurse_shifts (
  id             uuid primary key default gen_random_uuid(),
  location_id    uuid not null references public.portal_locations(id),
  staff_id       uuid not null references public.portal_staff(id),
  work_date      date not null,
  shift_start_at timestamptz not null,
  shift_end_at   timestamptz,
  worked_minutes integer,
  status         portal_attendance_status not null default 'active',
  recorded_by    uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.portal_nurse_shifts enable row level security;
drop trigger if exists trg_portal_nurse_shifts_updated on public.portal_nurse_shifts;
create trigger trg_portal_nurse_shifts_updated
  before update on public.portal_nurse_shifts
  for each row execute function public.portal_set_updated_at();
create index if not exists ix_portal_nurse_shifts_loc_date on public.portal_nurse_shifts (location_id, work_date);

-- ---------------------------------------------------------------------
-- portal_doctor_daily_duty — doctor working at a location by day only
-- ---------------------------------------------------------------------
create table if not exists public.portal_doctor_daily_duty (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.portal_locations(id),
  staff_id    uuid not null references public.portal_staff(id),
  work_date   date not null,
  note        text,
  recorded_by uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (location_id, work_date, staff_id)
);
alter table public.portal_doctor_daily_duty enable row level security;
drop trigger if exists trg_portal_doctor_duty_updated on public.portal_doctor_daily_duty;
create trigger trg_portal_doctor_duty_updated
  before update on public.portal_doctor_daily_duty
  for each row execute function public.portal_set_updated_at();
create index if not exists ix_portal_doctor_duty_loc_date on public.portal_doctor_daily_duty (location_id, work_date);

-- ---------------------------------------------------------------------
-- portal_audit_log — append-only trace of sensitive actions
-- ---------------------------------------------------------------------
create table if not exists public.portal_audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  actor_role    text,
  location_id   uuid references public.portal_locations(id),
  entity_type   text not null,
  entity_id     uuid,
  action        text not null,
  before_data   jsonb,
  after_data    jsonb,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);
alter table public.portal_audit_log enable row level security;
create index if not exists ix_portal_audit_actor on public.portal_audit_log (actor_user_id, created_at);
create index if not exists ix_portal_audit_entity on public.portal_audit_log (entity_type, entity_id, created_at);
