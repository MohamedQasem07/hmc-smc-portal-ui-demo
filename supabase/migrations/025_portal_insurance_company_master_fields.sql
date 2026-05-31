-- =====================================================================
-- 025_portal_insurance_company_master_fields.sql  — DRAFT (NOT APPLIED)
-- Phase C: structured insurer/assistance selection. Both master tables
-- already exist (portal_insurance_companies, portal_local_assistance_companies);
-- this only ADDS nullable columns. Existing RLS already covers them
-- (insurers: select+insert by active user, update/delete admin). Existing
-- cases keep displaying their insurer text via portal_insurance_intakes
-- (snapshot) regardless of mapping.
--
-- ROLLBACK:
--   alter table public.portal_local_assistance_companies
--     drop column if exists notes, drop column if exists default_contact_person;
--   alter table public.portal_insurance_companies
--     drop column if exists notes, drop column if exists default_billing_facility_id,
--     drop column if exists default_contact_person, drop column if exists default_assistance_company_id,
--     drop column if exists workflow_type;
-- =====================================================================

alter table public.portal_insurance_companies
  add column if not exists workflow_type text check (workflow_type in ('direct','assistance')),
  add column if not exists default_assistance_company_id uuid references public.portal_local_assistance_companies(id),
  add column if not exists default_contact_person text,
  add column if not exists default_billing_facility_id uuid references public.portal_billing_facilities(id),
  add column if not exists notes text;

alter table public.portal_local_assistance_companies
  add column if not exists default_contact_person text,
  add column if not exists notes text;

-- VERIFY:
--   select table_name, column_name from information_schema.columns
--   where (table_name='portal_insurance_companies' and column_name in
--          ('workflow_type','default_assistance_company_id','default_billing_facility_id','default_contact_person','notes'))
--      or (table_name='portal_local_assistance_companies' and column_name in ('default_contact_person','notes'));
