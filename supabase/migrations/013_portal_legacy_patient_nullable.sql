-- =====================================================================
-- 013_portal_legacy_patient_nullable.sql  (P3B.4 prerequisite)
-- ---------------------------------------------------------------------
-- PURPOSE
--   Legacy Master Sheet rows may lack DOB / gender. Per Mohamed's approved
--   rule "import all historical cases", relax NOT NULL on
--   portal_patients.date_of_birth and gender so incomplete legacy rows can
--   still be imported (age is computed, not stored; values may be genuinely
--   unknown for historical cases).
--
--   New OPERATIONAL intake still REQUIRES DOB + gender — enforced at the
--   application / function layer (frontend validation + create-case path),
--   not by a table NOT NULL, so legacy and live data can coexist.
--
-- SAFETY: additive constraint relaxation only. No data changed.
-- ROLLBACK: re-add NOT NULL after backfilling any null DOB/gender.
-- =====================================================================
alter table public.portal_patients alter column date_of_birth drop not null;
alter table public.portal_patients alter column gender drop not null;
