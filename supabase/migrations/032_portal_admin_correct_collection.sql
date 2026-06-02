-- =============================================================================
-- 032_portal_admin_correct_collection.sql   — APPLIED 2026-06-02 (owner-approved)
-- -----------------------------------------------------------------------------
-- Admin-only, ATOMIC "reverse-and-replace" correction for ONE recorded collection.
-- Purpose: a nurse recorded a payment with the wrong method/channel (e.g. Physical
-- Cash that should be Visa/Card). Admin reclassifies it WITHOUT double-counting
-- revenue and WITHOUT leaving the wrong money in the wrong treasury bucket.
--
-- ADDITIVE ONLY: one new function. NO table/column/RLS/enum changes. Reuses the
-- existing infra already in the schema:
--   * portal_collections.status  enum value 'cancelled'        (void the old row)
--   * portal_treasury_movements.movement_type 'adjustment_reversal'
--   * portal_treasury_movements.reversed_movement_id            (reversal pointer)
--   * portal_audit(entity,id,action,location,before,after)      (before/after trail)
--
-- A correction reclassifies an ALREADY-SETTLED amount, so it PRESERVES the settled
-- amount (actual_collected_amount) and just changes method/channel/currency — it
-- does NOT recompute the amount via FX (that would double-convert money that has
-- already hit the till). FX rate is stored as metadata only.
-- =============================================================================

create or replace function public.portal_admin_correct_collection(
  p_collection_id       uuid,
  p_new_payment_method  portal_payment_method,            -- 'cash' | 'visa_card'
  p_new_actual_amount   numeric        default null,      -- settled amount; defaults to the old actual_collected_amount
  p_new_actual_currency portal_currency default null,     -- settled currency; defaults to the old actual_currency
  p_new_fx_rate         numeric        default null,      -- optional metadata (invoice<->settlement); NOT used to recompute the settled amount
  p_reason              text           default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_old        public.portal_collections;
  v_channel    portal_treasury_channel;
  v_cur        portal_currency;
  v_amt        numeric(14,2);
  v_account_id uuid;
  v_new_id     uuid;
  v_mv         record;
  v_reversed   int := 0;
begin
  -- (1) STRICT admin-only. Corrections move treasury money → admin, never case-access.
  if not public.portal_is_admin() then
    raise exception 'PORTAL_DENIED: admin only';
  end if;

  -- (2) Reason is mandatory.
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'PORTAL_RULE: a correction reason is required';
  end if;

  -- (3) Load + LOCK the target (FOR UPDATE blocks a concurrent double-correction).
  select * into v_old from public.portal_collections where id = p_collection_id for update;
  if not found then
    raise exception 'PORTAL_NOTFOUND: collection % does not exist', p_collection_id;
  end if;

  -- (4) Block unsafe states (fail clearly, never silently).
  if v_old.status = 'cancelled' then
    raise exception 'PORTAL_RULE: collection % is already cancelled — nothing to correct', p_collection_id;
  end if;
  if v_old.status = 'handed_over' then
    raise exception 'PORTAL_RULE: collection % was already handed over — correct via a handover adjustment, not here', p_collection_id;
  end if;

  -- (5) Resolve the corrected settled amount/currency (default to the old settlement)
  --     and derive the channel from the method (mirrors portal_record_collection).
  v_amt := round(coalesce(p_new_actual_amount, v_old.actual_collected_amount), 2);
  v_cur := coalesce(p_new_actual_currency, v_old.actual_currency);
  if v_amt <= 0 then
    raise exception 'PORTAL_RULE: corrected amount must be > 0';
  end if;
  if p_new_payment_method = 'visa_card' then
    v_channel := 'visa_bank';
    if v_cur <> 'EGP' then
      raise exception 'PORTAL_RULE: Visa/Card settles in EGP only';
    end if;
  else
    v_channel := 'physical_cash';
  end if;

  -- (6) REVERSE every un-reversed 'collection' movement of the old collection.
  --     adjustment_reversal with the OPPOSITE direction zeroes the wrong bucket.
  for v_mv in
    select * from public.portal_treasury_movements
    where collection_id = p_collection_id
      and movement_type = 'collection'
      and reversed_movement_id is null
  loop
    insert into public.portal_treasury_movements
      (treasury_account_id, movement_type, direction, amount, currency, case_id, collection_id, description, created_by, reversed_movement_id)
    values
      (v_mv.treasury_account_id, 'adjustment_reversal',
       (case when v_mv.direction = 'in' then 'out' else 'in' end)::portal_movement_direction,
       v_mv.amount, v_mv.currency, v_mv.case_id, p_collection_id,
       'Correction reversal: ' || left(p_reason, 200), auth.uid(), v_mv.id);
    v_reversed := v_reversed + 1;
  end loop;

  -- Consistency guard: a 'recorded' collection must have had a movement to reverse.
  if v_reversed = 0 then
    raise exception 'PORTAL_INCONSISTENT: no treasury movement found for collection % — refusing to correct', p_collection_id;
  end if;

  -- (7) VOID the old collection (kept for audit/history; reads must exclude 'cancelled').
  update public.portal_collections
     set status = 'cancelled', updated_at = now()
   where id = p_collection_id;

  -- (8) INSERT the corrected collection — same case/charge/purpose/invoice + ORIGINAL
  --     collector & time (same physical payment, reclassified). Settled amount preserved.
  insert into public.portal_collections
    (case_id, charge_id, collection_purpose, payment_method, invoice_currency,
     foreign_amount_covered, actual_currency, fx_rate, actual_collected_amount,
     treasury_channel, collection_location_id, collected_by, collected_at, status)
  values
    (v_old.case_id, v_old.charge_id, v_old.collection_purpose, p_new_payment_method, v_old.invoice_currency,
     v_old.foreign_amount_covered, v_cur, coalesce(p_new_fx_rate, v_old.fx_rate), v_amt,
     v_channel, v_old.collection_location_id, v_old.collected_by, v_old.collected_at, 'recorded')
  returning id into v_new_id;

  -- (9) NEW treasury movement in the corrected channel/currency.
  select id into v_account_id from public.portal_treasury_accounts
   where location_id = v_old.collection_location_id and currency = v_cur and channel = v_channel;
  if v_account_id is null then
    raise exception 'PORTAL_CONFIG: no % treasury account for % at this location', v_channel, v_cur;
  end if;
  insert into public.portal_treasury_movements
    (treasury_account_id, movement_type, direction, amount, currency, case_id, collection_id, description, created_by)
  values
    (v_account_id, 'collection', 'in', v_amt, v_cur, v_old.case_id, v_new_id,
     'Collection (corrected) ' || v_old.collection_purpose::text, auth.uid());

  -- (10) AUDIT before/after + reason.
  perform public.portal_audit('collection', p_collection_id, 'corrected', v_old.collection_location_id,
    to_jsonb(v_old),
    jsonb_build_object(
      'new_collection_id', v_new_id, 'new_method', p_new_payment_method, 'new_channel', v_channel,
      'new_actual_amount', v_amt, 'new_actual_currency', v_cur, 'reversed_movements', v_reversed,
      'reason', p_reason));

  return jsonb_build_object('new_collection_id', v_new_id, 'cancelled_collection_id', p_collection_id, 'reversed_movements', v_reversed);
end;
$function$;

-- Execution: authenticated only (the portal_is_admin() guard inside is the real
-- gate; anon must never call it). Mirrors the lock-down of the other portal_* RPCs.
revoke all on function public.portal_admin_correct_collection(uuid, portal_payment_method, numeric, portal_currency, numeric, text) from public, anon;
grant execute on function public.portal_admin_correct_collection(uuid, portal_payment_method, numeric, portal_currency, numeric, text) to authenticated;

-- ROLLBACK:
--   drop function public.portal_admin_correct_collection(uuid, portal_payment_method, numeric, portal_currency, numeric, text);
-- (Additive function only — dropping it removes the capability. Corrections it has
--  already performed are legitimate data changes and are NOT auto-undone.)
