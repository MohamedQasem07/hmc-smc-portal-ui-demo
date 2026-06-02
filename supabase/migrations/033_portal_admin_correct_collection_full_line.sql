-- =============================================================================
-- 033_portal_admin_correct_collection_full_line.sql  — APPLIED 2026-06-02 (owner-approved)
-- -----------------------------------------------------------------------------
-- Generalizes the P3O correction RPC so it accepts the FULL payment line
-- (method, invoice/payment currency, foreign amount, settlement currency, FX)
-- and recomputes the settlement EXACTLY like portal_record_collection — so an
-- admin editing a recorded payment row's amount/method/currency/FX in the
-- unified payment table is reflected everywhere. Still ONE atomic
-- reverse-and-replace (reverse old movement → cancel old collection → re-record
-- the corrected collection + movement → before/after audit). Settled amount is
-- DERIVED from foreign × FX (not preserved), because the admin is editing the
-- payment amount itself.
--
-- ADDITIVE: replaces the function body/signature only. NO table/RLS/enum change.
-- Drops the P3O 6-arg (settled-centric) signature first (no production callers —
-- only cleaned-up UAT used it).
-- =============================================================================

drop function if exists public.portal_admin_correct_collection(uuid, portal_payment_method, numeric, portal_currency, numeric, text);

create or replace function public.portal_admin_correct_collection(
  p_collection_id        uuid,
  p_new_payment_method   portal_payment_method,   -- 'cash' | 'visa_card'
  p_new_invoice_currency portal_currency,          -- payment / foreign currency (e.g. EUR)
  p_new_foreign_amount   numeric,                  -- payment amount covered (e.g. 120)
  p_new_actual_currency  portal_currency,          -- settlement currency (EGP for visa; = invoice for same-cur cash)
  p_new_fx_rate          numeric,                  -- EGP per unit; required for visa & cross-currency cash
  p_reason               text
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_old        public.portal_collections;
  v_channel    portal_treasury_channel;
  v_actual_amt numeric(14,2);
  v_account_id uuid;
  v_new_id     uuid;
  v_mv         record;
  v_reversed   int := 0;
begin
  -- (1) STRICT admin-only.
  if not public.portal_is_admin() then raise exception 'PORTAL_DENIED: admin only'; end if;
  -- (2) Reason required.
  if p_reason is null or btrim(p_reason) = '' then raise exception 'PORTAL_RULE: a correction reason is required'; end if;
  -- (3) Load + lock the target (blocks concurrent double-correction).
  select * into v_old from public.portal_collections where id = p_collection_id for update;
  if not found then raise exception 'PORTAL_NOTFOUND: collection % does not exist', p_collection_id; end if;
  -- (4) Block unsafe states.
  if v_old.status = 'cancelled'   then raise exception 'PORTAL_RULE: collection % is already cancelled', p_collection_id; end if;
  if v_old.status = 'handed_over' then raise exception 'PORTAL_RULE: collection % was already handed over — correct via a handover adjustment, not here', p_collection_id; end if;
  -- (5) Validate the new amount.
  if p_new_foreign_amount is null or p_new_foreign_amount <= 0 then raise exception 'PORTAL_RULE: corrected amount must be > 0'; end if;

  -- (6) Derive channel + SETTLEMENT amount exactly like portal_record_collection.
  if p_new_payment_method = 'visa_card' then
    v_channel := 'visa_bank';
    if p_new_actual_currency <> 'EGP' then raise exception 'PORTAL_RULE: Visa/Card settles in EGP only'; end if;
    if p_new_fx_rate is null or p_new_fx_rate <= 0 then raise exception 'PORTAL_RULE: FX rate required for Visa/Card'; end if;
    v_actual_amt := round(p_new_foreign_amount * p_new_fx_rate, 2);
  else
    v_channel := 'physical_cash';
    if p_new_actual_currency = p_new_invoice_currency then
      v_actual_amt := round(p_new_foreign_amount, 2);
    else
      if p_new_fx_rate is null or p_new_fx_rate <= 0 then raise exception 'PORTAL_RULE: FX rate required for cross-currency cash'; end if;
      v_actual_amt := round(p_new_foreign_amount * p_new_fx_rate, 2);
    end if;
  end if;

  -- (7) REVERSE every un-reversed 'collection' movement of the old collection.
  for v_mv in
    select * from public.portal_treasury_movements
    where collection_id = p_collection_id and movement_type = 'collection' and reversed_movement_id is null
  loop
    insert into public.portal_treasury_movements
      (treasury_account_id, movement_type, direction, amount, currency, case_id, collection_id, description, created_by, reversed_movement_id)
    values (v_mv.treasury_account_id, 'adjustment_reversal',
       (case when v_mv.direction = 'in' then 'out' else 'in' end)::portal_movement_direction,
       v_mv.amount, v_mv.currency, v_mv.case_id, p_collection_id, 'Correction reversal: ' || left(p_reason, 200), auth.uid(), v_mv.id);
    v_reversed := v_reversed + 1;
  end loop;
  if v_reversed = 0 then raise exception 'PORTAL_INCONSISTENT: no treasury movement found for collection % — refusing to correct', p_collection_id; end if;

  -- (8) VOID the old collection (kept for the admin-only Corrected-history block).
  update public.portal_collections set status = 'cancelled', updated_at = now() where id = p_collection_id;

  -- (9) RE-RECORD the corrected collection with the FULL new line (original
  --     collector + time preserved — same payment event, corrected values).
  insert into public.portal_collections
    (case_id, charge_id, collection_purpose, payment_method, invoice_currency,
     foreign_amount_covered, actual_currency, fx_rate, actual_collected_amount,
     treasury_channel, collection_location_id, collected_by, collected_at, status)
  values
    (v_old.case_id, v_old.charge_id, v_old.collection_purpose, p_new_payment_method, p_new_invoice_currency,
     round(p_new_foreign_amount, 2), p_new_actual_currency, p_new_fx_rate, v_actual_amt,
     v_channel, v_old.collection_location_id, v_old.collected_by, v_old.collected_at, 'recorded')
  returning id into v_new_id;

  -- (10) New treasury movement in the corrected channel/currency.
  select id into v_account_id from public.portal_treasury_accounts
   where location_id = v_old.collection_location_id and currency = p_new_actual_currency and channel = v_channel;
  if v_account_id is null then raise exception 'PORTAL_CONFIG: no % treasury account for % at this location', v_channel, p_new_actual_currency; end if;
  insert into public.portal_treasury_movements
    (treasury_account_id, movement_type, direction, amount, currency, case_id, collection_id, description, created_by)
  values (v_account_id, 'collection', 'in', v_actual_amt, p_new_actual_currency, v_old.case_id, v_new_id,
     'Collection (corrected) ' || v_old.collection_purpose::text, auth.uid());

  -- (11) AUDIT before/after + reason.
  perform public.portal_audit('collection', p_collection_id, 'corrected', v_old.collection_location_id, to_jsonb(v_old),
    jsonb_build_object('new_collection_id', v_new_id, 'new_method', p_new_payment_method, 'new_channel', v_channel,
      'new_invoice_currency', p_new_invoice_currency, 'new_foreign_amount', round(p_new_foreign_amount, 2),
      'new_actual_currency', p_new_actual_currency, 'new_fx_rate', p_new_fx_rate, 'new_actual_amount', v_actual_amt,
      'reversed_movements', v_reversed, 'reason', p_reason));

  return jsonb_build_object('new_collection_id', v_new_id, 'cancelled_collection_id', p_collection_id,
    'reversed_movements', v_reversed, 'new_actual_amount', v_actual_amt, 'new_channel', v_channel);
end;
$function$;

revoke all on function public.portal_admin_correct_collection(uuid, portal_payment_method, portal_currency, numeric, portal_currency, numeric, text) from public, anon;
grant execute on function public.portal_admin_correct_collection(uuid, portal_payment_method, portal_currency, numeric, portal_currency, numeric, text) to authenticated;

-- ROLLBACK:
--   drop function public.portal_admin_correct_collection(uuid, portal_payment_method, portal_currency, numeric, portal_currency, numeric, text);
--   -- then restore the P3O 6-arg settled-centric version from migration 032 if desired.
