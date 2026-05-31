-- =====================================================================
-- 001_portal_extensions_and_enums.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   Foundation layer for the HMC / SMC Clinic Portal backend (P3A):
--   required extensions, all enum types, and shared trigger helpers.
--
-- AFFECTED OBJECTS
--   - extension: pgcrypto (for gen_random_uuid)
--   - enum types: portal_* (see body)
--   - function: portal_set_updated_at() — generic updated_at trigger fn
--
-- SAFETY
--   Additive only. Creates new types/functions in the public schema with
--   the `portal_` prefix. Does NOT touch any existing table, the existing
--   `portal` schema (hmc-medical), or any data. Re-runnable (guards used).
--
-- ROLLBACK
--   drop function if exists public.portal_set_updated_at() cascade;
--   drop type if exists <each portal_* enum> ;  -- only if no table uses it
--
-- VERIFICATION
--   select typname from pg_type where typname like 'portal_%';
--   select proname from pg_proc where proname = 'portal_set_updated_at';
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enum types (Section 6). Small, stable value sets. Roles & statuses
-- include forward-looking values so future sprints need no type change.
-- ---------------------------------------------------------------------
do $$
begin
  -- Operational location kind
  if not exists (select 1 from pg_type where typname = 'portal_location_type') then
    create type portal_location_type as enum ('external_clinic', 'main_branch');
  end if;

  -- Employee role (HR directory)
  if not exists (select 1 from pg_type where typname = 'portal_staff_role') then
    create type portal_staff_role as enum ('nurse', 'doctor', 'reception', 'admin', 'other');
  end if;

  -- Application/portal user role. Foundation uses admin/clinic_user/reception_user.
  -- Remaining values are reserved for future approved sprints.
  if not exists (select 1 from pg_type where typname = 'portal_role') then
    create type portal_role as enum (
      'admin', 'clinic_user', 'reception_user',
      'owner', 'insurance_staff', 'treasury', 'nurse', 'doctor', 'viewer_auditor'
    );
  end if;

  -- Financial classification of a case
  if not exists (select 1 from pg_type where typname = 'portal_financial_type') then
    create type portal_financial_type as enum ('pending', 'cash', 'insurance', 'free_complimentary');
  end if;

  -- Patient journey route
  if not exists (select 1 from pg_type where typname = 'portal_route_type') then
    create type portal_route_type as enum ('direct', 'transfer_to_al_kawther', 'transfer_to_sheraton', 'transfer_other');
  end if;

  -- Encounter pattern (visit shape)
  if not exists (select 1 from pg_type where typname = 'portal_encounter_pattern') then
    create type portal_encounter_pattern as enum ('outpatient_single', 'outpatient_multi', 'inpatient_admission');
  end if;

  -- Treatment mode (main branches only)
  if not exists (select 1 from pg_type where typname = 'portal_treatment_mode') then
    create type portal_treatment_mode as enum ('not_determined', 'conservative', 'surgical');
  end if;

  -- Operational status of a case
  if not exists (select 1 from pg_type where typname = 'portal_operational_status') then
    create type portal_operational_status as enum ('open', 'closed', 'transferred', 'received', 'cancelled');
  end if;

  -- Encounter row type + status
  if not exists (select 1 from pg_type where typname = 'portal_encounter_type') then
    create type portal_encounter_type as enum ('outpatient_visit', 'session', 'inpatient_admission');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_encounter_status') then
    create type portal_encounter_status as enum ('active', 'completed', 'discharged', 'cancelled');
  end if;

  -- Transfers
  if not exists (select 1 from pg_type where typname = 'portal_transfer_status') then
    create type portal_transfer_status as enum ('requested', 'sent', 'received', 'cancelled');
  end if;

  -- Room assignment occupancy
  if not exists (select 1 from pg_type where typname = 'portal_room_assignment_status') then
    create type portal_room_assignment_status as enum ('occupied', 'released', 'cancelled');
  end if;

  -- Money channels & methods
  if not exists (select 1 from pg_type where typname = 'portal_payment_method') then
    create type portal_payment_method as enum ('cash', 'visa_card');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_treasury_channel') then
    create type portal_treasury_channel as enum ('physical_cash', 'visa_bank');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_collection_purpose') then
    create type portal_collection_purpose as enum ('cash_case_payment', 'patient_excess');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_charge_type') then
    create type portal_charge_type as enum ('cash_case_amount', 'patient_excess');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_charge_status') then
    create type portal_charge_status as enum ('open', 'partially_collected', 'collected', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_collection_status') then
    create type portal_collection_status as enum ('recorded', 'handed_over', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_movement_type') then
    create type portal_movement_type as enum ('collection', 'expense', 'cash_handover', 'visa_handover', 'adjustment_reversal');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_movement_direction') then
    create type portal_movement_direction as enum ('in', 'out');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_expense_status') then
    create type portal_expense_status as enum ('recorded', 'handed_over', 'reversed');
  end if;

  -- Handovers
  if not exists (select 1 from pg_type where typname = 'portal_handover_type') then
    create type portal_handover_type as enum ('physical_cash', 'visa_bank');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_handover_status') then
    create type portal_handover_status as enum ('draft', 'submitted', 'confirmed', 'closed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_handover_result') then
    create type portal_handover_result as enum ('match', 'over', 'shortage');
  end if;
  if not exists (select 1 from pg_type where typname = 'portal_confirmation_status') then
    create type portal_confirmation_status as enum ('pending', 'confirmed', 'rejected');
  end if;

  -- Insurance billing preparation lifecycle
  if not exists (select 1 from pg_type where typname = 'portal_insurance_billing_preparation_status') then
    create type portal_insurance_billing_preparation_status as enum (
      'awaiting_admin_completion',
      'ready_for_claude_invoice_preparation',
      'invoice_generated_future_placeholder',
      'review_required',
      'completed'
    );
  end if;

  -- Attendance
  if not exists (select 1 from pg_type where typname = 'portal_attendance_status') then
    create type portal_attendance_status as enum ('active', 'completed', 'cancelled');
  end if;

  -- Assignment role (staff↔location)
  if not exists (select 1 from pg_type where typname = 'portal_assignment_role') then
    create type portal_assignment_role as enum ('nurse', 'doctor', 'reception', 'other');
  end if;

  -- Money currency
  if not exists (select 1 from pg_type where typname = 'portal_currency') then
    create type portal_currency as enum ('EGP', 'EUR', 'USD', 'GBP');
  end if;

  -- Gender (patient) — male/female only per spec
  if not exists (select 1 from pg_type where typname = 'portal_gender') then
    create type portal_gender as enum ('male', 'female');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- Shared updated_at trigger function
-- ---------------------------------------------------------------------
create or replace function public.portal_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.portal_set_updated_at() is
  'P3A: generic BEFORE UPDATE trigger that stamps updated_at = now().';
