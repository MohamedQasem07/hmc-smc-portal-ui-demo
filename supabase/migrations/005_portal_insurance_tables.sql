-- =====================================================================
-- 005_portal_insurance_tables.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   Insurance catalogue + the TWO-STAGE insurance workflow:
--     Stage 1 (clinic/reception visible): portal_insurance_intakes
--     Stage 2 (ADMIN-ONLY, protected):    portal_insurance_billing_preparations
--   Plus insurer + local-assistance catalogues.
--
-- AFFECTED OBJECTS
--   tables (new):
--     portal_insurance_companies
--     portal_local_assistance_companies
--     portal_insurance_intakes
--     portal_insurance_billing_preparations   <-- ADMIN-ONLY (privacy critical)
--   RLS: ENABLED on all at creation (deny-all until 009).
--
-- PRIVACY REQUIREMENT (enforced by 009 policies)
--   Clinic/reception users may read/write portal_insurance_intakes for their
--   own location's cases ONLY, and must NEVER be able to select or write
--   portal_insurance_billing_preparations (Service Charge %, invoice currency,
--   local assistance, future invoice value, admin notes). Admin only.
--
-- SAFETY
--   Additive. No real insurer/assistance catalogue imported (test rows in 010).
--
-- ROLLBACK
--   drop table if exists public.portal_insurance_billing_preparations cascade;
--   drop table if exists public.portal_insurance_intakes cascade;
--   drop table if exists public.portal_local_assistance_companies cascade;
--   drop table if exists public.portal_insurance_companies cascade;
--
-- VERIFICATION
--   select relrowsecurity from pg_class where relname='portal_insurance_billing_preparations';  -- t
-- =====================================================================

-- ---------------------------------------------------------------------
-- portal_insurance_companies — insurer catalogue
-- ---------------------------------------------------------------------
create table if not exists public.portal_insurance_companies (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  email       text,
  phone       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);
alter table public.portal_insurance_companies enable row level security;
drop trigger if exists trg_portal_insurers_updated on public.portal_insurance_companies;
create trigger trg_portal_insurers_updated
  before update on public.portal_insurance_companies
  for each row execute function public.portal_set_updated_at();

-- ---------------------------------------------------------------------
-- portal_local_assistance_companies — Egyptian/local assistance (Admin use)
-- ---------------------------------------------------------------------
create table if not exists public.portal_local_assistance_companies (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  email       text,
  phone       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.portal_local_assistance_companies enable row level security;
drop trigger if exists trg_portal_localassist_updated on public.portal_local_assistance_companies;
create trigger trg_portal_localassist_updated
  before update on public.portal_local_assistance_companies
  for each row execute function public.portal_set_updated_at();

-- ---------------------------------------------------------------------
-- portal_insurance_intakes — Stage 1, visible to clinic/reception
-- ---------------------------------------------------------------------
create table if not exists public.portal_insurance_intakes (
  id                        uuid primary key default gen_random_uuid(),
  case_id                   uuid unique not null references public.portal_cases(id) on delete cascade,
  insurance_company_id      uuid not null references public.portal_insurance_companies(id),
  insurance_reference_number text not null,
  insurance_company_email   text,
  insurance_company_phone   text,
  billing_facility_id       uuid not null references public.portal_billing_facilities(id),
  has_patient_excess        boolean not null default false,
  created_by                uuid references auth.users(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
alter table public.portal_insurance_intakes enable row level security;
drop trigger if exists trg_portal_ins_intake_updated on public.portal_insurance_intakes;
create trigger trg_portal_ins_intake_updated
  before update on public.portal_insurance_intakes
  for each row execute function public.portal_set_updated_at();

create index if not exists ix_portal_ins_intake_ref on public.portal_insurance_intakes (insurance_reference_number);

-- ---------------------------------------------------------------------
-- portal_insurance_billing_preparations — Stage 2, ADMIN-ONLY (protected)
-- These are the fields later consumed by Claude Code / Invoice Manager.
-- ---------------------------------------------------------------------
create table if not exists public.portal_insurance_billing_preparations (
  id                            uuid primary key default gen_random_uuid(),
  case_id                       uuid unique not null references public.portal_cases(id) on delete cascade,
  invoice_currency              portal_currency,
  service_charge_pct            numeric(6,2),
  local_assistance_company_id   uuid references public.portal_local_assistance_companies(id),
  local_assistance_reference_number text,
  billing_preparation_status    portal_insurance_billing_preparation_status
                                  not null default 'awaiting_admin_completion',
  admin_notes                   text,
  future_invoice_status         text,
  future_invoice_value          numeric(14,2),
  future_invoice_json_reference text,
  future_invoice_pdf_reference  text,
  completed_by                  uuid references auth.users(id),
  completed_at                  timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);
alter table public.portal_insurance_billing_preparations enable row level security;
drop trigger if exists trg_portal_ins_prep_updated on public.portal_insurance_billing_preparations;
create trigger trg_portal_ins_prep_updated
  before update on public.portal_insurance_billing_preparations
  for each row execute function public.portal_set_updated_at();

comment on table public.portal_insurance_billing_preparations is
  'P3A: ADMIN-ONLY protected billing preparation. Clinic/reception users must never read or write this table (enforced in 009 RLS).';
