-- P3J Task 2 — Safe admin "delete case" RPC.
-- APPLIED to hmc-medical (zlgxalmaiwatnoydgkxo) 2026-06-01 via MCP apply_migration.
-- SECURITY DEFINER + strict portal_is_admin() guard (NOT portal_can_access_case).
-- Deletes the case + ALL operational children (incl. financial rows, per the
-- owner spec for wrong/test cases) in FK-safe order, then the patient IF orphaned,
-- and writes a portal_audit('case', id, 'deleted', ...) row. Atomic (a plpgsql
-- function runs in one transaction; any raise rolls the whole delete back).
--
-- FK basis (verified): 10 children CASCADE from portal_cases; the only NO ACTION
-- blockers are portal_treasury_movements (case_id + collection_id),
-- portal_visa_handover_transactions (collection_id), portal_collections.charge_id,
-- and portal_legacy_case_staging (imported_case_id / matched_existing_case_id).
-- portal_patients has exactly one inbound FK (portal_cases.patient_id, NO ACTION),
-- so the orphan-patient delete is safe iff no OTHER case references it.
--
-- ROLLBACK: drop function public.portal_admin_delete_case(uuid, boolean);

create or replace function public.portal_admin_delete_case(
  p_case_id uuid,
  p_delete_orphan_patient boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_case public.portal_cases;
  v_patient_id uuid;
  v_patient_deleted boolean := false;
  n_visa int; n_treasury int; n_collections int; n_charges int; n_intakes int;
  n_preps int; n_history int; n_travel int; n_rooms int; n_services int; n_encounters int; n_transfers int;
  v_counts jsonb;
begin
  -- Strict admin-only (NOT portal_can_access_case — destructive must be admin).
  if not public.portal_is_admin() then
    raise exception 'PORTAL_DENIED: admin only';
  end if;

  select * into v_case from public.portal_cases where id = p_case_id;
  if not found then
    raise exception 'PORTAL_NOT_FOUND: case %', p_case_id;
  end if;
  v_patient_id := v_case.patient_id;

  -- NO ACTION finance refs first: visa-tx -> treasury -> collections -> charges.
  delete from public.portal_visa_handover_transactions
    where collection_id in (select id from public.portal_collections where case_id = p_case_id);
  get diagnostics n_visa = row_count;

  delete from public.portal_treasury_movements
    where case_id = p_case_id
       or collection_id in (select id from public.portal_collections where case_id = p_case_id);
  get diagnostics n_treasury = row_count;

  delete from public.portal_collections where case_id = p_case_id;
  get diagnostics n_collections = row_count;

  delete from public.portal_case_charges where case_id = p_case_id;
  get diagnostics n_charges = row_count;

  -- CASCADE children (explicit for determinism + count visibility).
  delete from public.portal_insurance_intakes where case_id = p_case_id;
  get diagnostics n_intakes = row_count;
  delete from public.portal_insurance_billing_preparations where case_id = p_case_id;
  get diagnostics n_preps = row_count;
  delete from public.portal_insurance_case_status_history where case_id = p_case_id;
  get diagnostics n_history = row_count;
  delete from public.portal_patient_travel_dates where case_id = p_case_id;
  get diagnostics n_travel = row_count;
  delete from public.portal_room_assignments where case_id = p_case_id;
  get diagnostics n_rooms = row_count;
  delete from public.portal_case_services where case_id = p_case_id;
  get diagnostics n_services = row_count;
  delete from public.portal_encounters where case_id = p_case_id;
  get diagnostics n_encounters = row_count;
  delete from public.portal_transfers where case_id = p_case_id;
  get diagnostics n_transfers = row_count;

  -- NO ACTION legacy back-refs: NULL them so the case delete is not blocked
  -- (do NOT delete the staging rows — they are import history).
  update public.portal_legacy_case_staging set imported_case_id = null where imported_case_id = p_case_id;
  update public.portal_legacy_case_staging set matched_existing_case_id = null where matched_existing_case_id = p_case_id;

  delete from public.portal_cases where id = p_case_id;

  -- Orphan patient (opt-in): only if no OTHER case references it.
  if p_delete_orphan_patient and v_patient_id is not null
     and not exists (select 1 from public.portal_cases where patient_id = v_patient_id) then
    delete from public.portal_patients where id = v_patient_id;
    v_patient_deleted := true;
  end if;

  v_counts := jsonb_build_object(
    'case_id', p_case_id,
    'patient_deleted', v_patient_deleted,
    'deleted', jsonb_build_object(
      'visa_handover_transactions', n_visa, 'treasury_movements', n_treasury,
      'collections', n_collections, 'case_charges', n_charges, 'insurance_intakes', n_intakes,
      'billing_preparations', n_preps, 'status_history', n_history, 'travel_dates', n_travel,
      'room_assignments', n_rooms, 'case_services', n_services, 'encounters', n_encounters,
      'transfers', n_transfers));

  perform public.portal_audit('case', p_case_id, 'deleted', v_case.current_location_id, to_jsonb(v_case), null, v_counts);
  return v_counts;
end;
$$;

revoke all on function public.portal_admin_delete_case(uuid, boolean) from public, anon;
grant execute on function public.portal_admin_delete_case(uuid, boolean) to authenticated;
