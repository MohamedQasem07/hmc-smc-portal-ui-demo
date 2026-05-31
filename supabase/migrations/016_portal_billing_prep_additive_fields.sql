-- =====================================================================
-- 016_portal_billing_prep_additive_fields.sql   (P3B — applied 2026-05-30)
-- Adds the 4 billing-prep fields the Aegis Insurance Completion screen
-- captures (Claude invoice inputs). Additive, idempotent, reversible.
-- =====================================================================
alter table public.portal_insurance_billing_preparations
  add column if not exists transportation_fee    numeric(14,2),
  add column if not exists patient_excess_amount  numeric(14,2),
  add column if not exists onedrive_folder_path    text,
  add column if not exists missing_data_note       text;

comment on column public.portal_insurance_billing_preparations.onedrive_folder_path is
  'P3B: path/link to the patient case folder (medical report + labs) Claude reads to generate the invoice.';
comment on column public.portal_insurance_billing_preparations.missing_data_note is
  'P3B: non-blocking note flagging data still missing; does not prevent a draft.';
comment on column public.portal_insurance_billing_preparations.transportation_fee is
  'P3B: ambulance/transfer charge (invoice currency) when documented in the report.';
comment on column public.portal_insurance_billing_preparations.patient_excess_amount is
  'P3B: patient-paid excess/deductible amount (invoice currency).';
