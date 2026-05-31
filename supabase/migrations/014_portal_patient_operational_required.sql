-- =====================================================================
-- 014_portal_patient_operational_required.sql  (P3B.4 prerequisite)
-- ---------------------------------------------------------------------
-- PURPOSE
--   013 relaxed NOT NULL on portal_patients.date_of_birth + gender so that
--   incomplete LEGACY rows can be imported. This migration re-enforces the
--   mandatory intake fields for NEW OPERATIONAL patients at the DATABASE
--   level (not just frontend), so legacy and live data coexist safely.
--
-- MECHANISM
--   - add portal_patients.is_legacy boolean (default false).
--   - CHECK: a patient is valid only if it is legacy OR has DOB AND gender.
--       is_legacy = true  -> DOB/gender may be NULL (approved, review-flagged)
--       is_legacy = false -> DOB AND gender REQUIRED (operational intake)
--   The legacy import sets is_legacy = true on every imported patient.
--   Operational intake (is_legacy default false) therefore cannot insert a
--   patient without DOB + gender — enforced server-side, frontend-independent.
--
-- SAFETY: additive. Existing rows (seed test patient has DOB+gender,
--   is_legacy=false) satisfy the constraint. No data changed.
-- ROLLBACK:
--   alter table public.portal_patients drop constraint chk_portal_patients_operational_required;
--   alter table public.portal_patients drop column is_legacy;
--   (optionally re-add NOT NULL on date_of_birth/gender after backfill)
-- =====================================================================

alter table public.portal_patients
  add column if not exists is_legacy boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'chk_portal_patients_operational_required') then
    alter table public.portal_patients
      add constraint chk_portal_patients_operational_required
      check (is_legacy = true or (date_of_birth is not null and gender is not null));
  end if;
end$$;

comment on column public.portal_patients.is_legacy is
  'P3B: true for Master Sheet legacy-imported patients (DOB/gender may be null + review-flagged). Operational patients (false) must have DOB + gender (enforced by chk_portal_patients_operational_required).';
