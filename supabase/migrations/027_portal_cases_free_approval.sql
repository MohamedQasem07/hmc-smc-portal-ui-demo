-- =====================================================================
-- 027_portal_cases_free_approval.sql  — DRAFT (NOT APPLIED — approval-gated)
-- Phase E: structured Free/Complimentary approval. Nullable columns only;
-- NO data mutation. Existing free cases keep free_reason; new columns stay
-- NULL. Any backfill of approver-from-notes is a SEPARATE, later, approved
-- step (not here). UI will enforce reason + approver before save on NEW
-- free cases.
--
-- ROLLBACK:
--   alter table public.portal_cases
--     drop column if exists free_approval_notes,
--     drop column if exists free_approved_at,
--     drop column if exists free_approved_by;
-- =====================================================================

alter table public.portal_cases
  add column if not exists free_approved_by    text,
  add column if not exists free_approved_at    timestamptz,
  add column if not exists free_approval_notes text;

-- VERIFY:
--   select column_name, is_nullable from information_schema.columns
--   where table_schema='public' and table_name='portal_cases'
--     and column_name in ('free_approved_by','free_approved_at','free_approval_notes');
