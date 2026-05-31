-- =====================================================================
-- 019_config_reference_tables.sql  — REPO MIRROR (NOT a new change)
-- ---------------------------------------------------------------------
-- ALREADY APPLIED to hmc-medical as migration-history version
-- 20260531000615 ("019_config_reference_tables"). The repo was missing this
-- file (only 001-018, 020-023 were committed); this restores lineage BEFORE
-- adding 024+. IDEMPOTENT and matches the live structure — safe, but NOT
-- intended to be re-applied to production (the team applies via MCP
-- apply_migration, which assigns its own timestamp version).
--
-- Creates portal_payment_methods + portal_nationalities (admin-write,
-- active-user-read) for the config-first staging work (2026-05-31).
-- The 245-row nationalities seed (sourced read-only from hmc-v2) was applied
-- live and is NOT reproduced here; regenerate via a dump if a full repo
-- rebuild is ever needed.
-- =====================================================================

create table if not exists public.portal_payment_methods (
  code            text primary key,
  label           text not null,
  kind            text not null default 'method',
  settlement_note text,
  active          boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.portal_payment_methods enable row level security;
drop policy if exists portal_payment_methods_sel on public.portal_payment_methods;
create policy portal_payment_methods_sel on public.portal_payment_methods
  for select to authenticated using (public.portal_is_active_user());
drop policy if exists portal_payment_methods_admin on public.portal_payment_methods;
create policy portal_payment_methods_admin on public.portal_payment_methods
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());
grant select, insert, update, delete on public.portal_payment_methods to authenticated;

drop trigger if exists trg_payment_methods_updated on public.portal_payment_methods;
create trigger trg_payment_methods_updated before update on public.portal_payment_methods
  for each row execute function public.portal_set_updated_at();

create table if not exists public.portal_nationalities (
  id          text primary key,
  name_en     text not null,
  name_ar     text,
  flag        text,
  phone_code  text,
  active      boolean not null default true,
  sort_order  integer,
  created_at  timestamptz not null default now()
);
alter table public.portal_nationalities enable row level security;
drop policy if exists portal_nationalities_sel on public.portal_nationalities;
create policy portal_nationalities_sel on public.portal_nationalities
  for select to authenticated using (public.portal_is_active_user());
drop policy if exists portal_nationalities_admin on public.portal_nationalities;
create policy portal_nationalities_admin on public.portal_nationalities
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());
grant select, insert, update, delete on public.portal_nationalities to authenticated;

-- NOTE: 245-row nationalities seed applied live (history version 20260531000615); not reproduced here.
