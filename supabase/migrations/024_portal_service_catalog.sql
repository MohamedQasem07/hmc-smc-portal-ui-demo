-- =====================================================================
-- 024_portal_service_catalog.sql  — DRAFT (NOT APPLIED — approval-gated)
-- Phase B: structured "performed services" capture for future Claude Code
-- invoice generation. The portal NEVER prices and NEVER generates invoices.
-- Catalog rows carry NO prices; clinic/reception read them to tick what was
-- done. Claude later maps canonical_billing_name/source_code -> the locked
-- HMC/SMC billing engine. Categories use text+CHECK (no new enums).
--
-- ROLLBACK:
--   drop table if exists public.portal_case_services;
--   drop table if exists public.portal_service_catalog;
-- =====================================================================

create table if not exists public.portal_service_catalog (
  id                     uuid primary key default gen_random_uuid(),
  category               text not null check (category in ('basic','specialist','labs','radiology','procedure','medication','other')),
  display_name           text not null,
  canonical_billing_name text,                         -- exact name in HMC/SMC engine (nullable until mapped)
  source_system          text,                          -- 'HMC' | 'SMC' | 'manual'
  source_table           text,                          -- e.g. 'HMC_PRICES' | 'SMC_LABS'
  source_code            text,                          -- e.g. 'CBC' | 'S-creatinin'
  billing_mapping_hint   text,                          -- free text for Claude (e.g. 'Electrolytes -> Na,K,Cl per labs breakdown')
  default_quantity       numeric not null default 1,
  is_active              boolean not null default true,
  sort_order             integer,
  notes                  text,
  created_by             uuid references auth.users(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
alter table public.portal_service_catalog enable row level security;
create policy portal_service_catalog_sel on public.portal_service_catalog
  for select to authenticated using (public.portal_is_active_user());   -- read only; NO price columns exist here
create policy portal_service_catalog_admin on public.portal_service_catalog
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());
grant select, insert, update, delete on public.portal_service_catalog to authenticated;
create index if not exists idx_service_catalog_active on public.portal_service_catalog(is_active, category, sort_order);
create trigger trg_service_catalog_updated before update on public.portal_service_catalog
  for each row execute function public.portal_set_updated_at();

create table if not exists public.portal_case_services (
  id                     uuid primary key default gen_random_uuid(),
  case_id                uuid not null references public.portal_cases(id) on delete cascade,
  encounter_id           uuid references public.portal_encounters(id) on delete set null,
  service_catalog_id     uuid references public.portal_service_catalog(id),
  category               text not null,
  display_name           text not null,
  canonical_billing_name text,
  quantity               numeric not null default 1,
  performed_at           timestamptz,
  notes                  text,
  selected_by_user_id    uuid references auth.users(id),
  selected_by_staff_id   uuid references public.portal_staff(id),
  billing_status         text not null default 'draft'
                           check (billing_status in ('draft','needs_review','ready_for_billing','ignored')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
alter table public.portal_case_services enable row level security;
create policy portal_case_services_sel on public.portal_case_services
  for select to authenticated using (public.portal_can_access_case(case_id));
create policy portal_case_services_cud on public.portal_case_services
  for all to authenticated using (public.portal_can_access_case(case_id)) with check (public.portal_can_access_case(case_id));
grant select, insert, update, delete on public.portal_case_services to authenticated;
create index if not exists idx_case_services_case on public.portal_case_services(case_id);
create trigger trg_case_services_updated before update on public.portal_case_services
  for each row execute function public.portal_set_updated_at();

-- VERIFY:
--   select count(*) from information_schema.tables where table_schema='public'
--     and table_name in ('portal_service_catalog','portal_case_services');   -- expect 2
