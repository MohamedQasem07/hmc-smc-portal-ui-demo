-- 030_portal_specialist_doctors
-- ADDITIVE-ONLY. New isolated directory of EXTERNAL visiting specialist doctors.
-- These are NOT staff: no auth login, no attendance, no clinic assignments, no billing.
-- Nothing references this table -> zero impact on any existing data/table.
-- RLS mirrors portal_service_catalog exactly: admin = full CRUD; any active user = SELECT
-- (so the case specialist-visit picker can read the roster). 028 is unrelated and stays absent.
-- Applied to hmc-medical 2026-06-01 (verified: existing row counts unchanged; no new advisor).

create table if not exists public.portal_specialist_doctors (
  id          uuid primary key default gen_random_uuid(),
  doctor_name text not null,
  specialty   text not null,
  phone       text,
  notes       text,
  active      boolean not null default true,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.portal_specialist_doctors is
  'External visiting specialist doctors directory (NOT staff; no auth/attendance/assignments/billing). Admin-managed; readable by any active user for the case specialist-visit picker.';

create index if not exists portal_specialist_doctors_active_idx   on public.portal_specialist_doctors (active);
create index if not exists portal_specialist_doctors_specialty_idx on public.portal_specialist_doctors (specialty);

alter table public.portal_specialist_doctors enable row level security;

-- Admin: full CRUD (mirrors portal_service_catalog_admin)
create policy portal_specialist_doctors_admin
  on public.portal_specialist_doctors
  for all to authenticated
  using (portal_is_admin())
  with check (portal_is_admin());

-- Any active authenticated user may read the roster (mirrors portal_service_catalog_sel)
create policy portal_specialist_doctors_sel
  on public.portal_specialist_doctors
  for select to authenticated
  using (portal_is_active_user());

grant select, insert, update, delete on public.portal_specialist_doctors to authenticated;
