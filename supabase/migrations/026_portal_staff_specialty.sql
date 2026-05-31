-- =====================================================================
-- 026_portal_staff_specialty.sql  — DRAFT (NOT APPLIED — approval-gated)
-- Phase D: reuse the EXISTING portal_staff doctor directory (no 2nd table).
-- One nullable column. Write stays admin-only (portal_staff_admin); read via
-- portal_staff_sel / fetchAssignableStaff. Specialist-visit picker auto-fills
-- specialty; inactive doctors already excluded from new-visit dropdowns; old
-- encounter notes keep their text/history.
--
-- ROLLBACK:
--   alter table public.portal_staff drop column if exists specialty;
-- =====================================================================

alter table public.portal_staff add column if not exists specialty text;

-- VERIFY:
--   select column_name, is_nullable from information_schema.columns
--   where table_schema='public' and table_name='portal_staff' and column_name='specialty';
