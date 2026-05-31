-- =====================================================================
-- 028_portal_handover_closure.sql  — DRAFT (NOT APPLIED — separate approval)
-- ---------------------------------------------------------------------
-- Phase F: Treasury handover closure MVP.
--
-- OWNER RULE (2026-05-31): Insurance Excess IS treasury money. It is INCLUDED
-- in the drawer/handover by payment method; collection_purpose is a REPORTING
-- split only (cash_case_payment vs patient_excess) — never excluded, never
-- shown as ordinary cash-case revenue.
--   * physical_cash handover book per currency = cash_case + patient_excess (both),
--     with a frozen split stored on the line.
--   * visa_bank handover includes both purposes; split derivable from the linked
--     collection; a voucher/slip reference is captured per transaction.
--   * Open balance = collections where handover_id IS NULL. Collections are
--     never deleted; daily reports always show originals.
--
-- All money writes are SECURITY DEFINER (direct writes to collections /
-- treasury_movements / visa_handover_transactions are admin-only at the table;
-- these RPCs self-authorize via portal_has_location()).
--
-- ROLLBACK:
--   drop function if exists public.portal_make_cash_handover(uuid,date,date,jsonb,text,text);
--   drop function if exists public.portal_confirm_visa_handover(uuid,uuid,numeric,text);
--   -- recreate the ORIGINAL 3-arg visa confirm (preserved verbatim below):
--   /* ORIGINAL portal_confirm_visa_handover(uuid,uuid,numeric):
--      inserts visa txn (no voucher_reference), marks collection handed_over (no handover_id link),
--      posts visa_handover movement, audits. Recreate from session-captured body if reverting. */
--   alter table public.portal_visa_handover_transactions drop column if exists voucher_reference;
--   alter table public.portal_cash_handover_lines
--     drop column if exists patient_excess_book_amount, drop column if exists cash_case_book_amount;
--   drop index if exists public.idx_collections_handover;
--   alter table public.portal_collections drop column if exists handover_id;  -- safe: rows untouched
-- =====================================================================

-- (a) link a settled collection to its handover (nullable; additive; both channels)
alter table public.portal_collections
  add column if not exists handover_id uuid references public.portal_handovers(id);
create index if not exists idx_collections_handover on public.portal_collections(handover_id);

-- (b) frozen per-purpose split on each cash handover currency line (additive).
--     book_amount stays the per-currency drawer total (cash_case + excess).
alter table public.portal_cash_handover_lines
  add column if not exists cash_case_book_amount      numeric(14,2),
  add column if not exists patient_excess_book_amount numeric(14,2);

-- (c) visa voucher/slip reference on the handover transaction (additive)
alter table public.portal_visa_handover_transactions
  add column if not exists voucher_reference text;

-- (d) CASH handover RPC — INCLUDES both purposes in the drawer; freezes the split.
create or replace function public.portal_make_cash_handover(
  p_location_id uuid, p_period_from date, p_period_to date,
  p_lines jsonb,                 -- [{ "currency":"EUR", "actual_delivered_amount":290 }, ...]
  p_received_by_name text default null, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_handover uuid; v_line jsonb;
        v_cur portal_currency; v_book numeric; v_cash numeric; v_excess numeric; v_actual numeric;
begin
  if not (public.portal_is_admin() or public.portal_has_location(p_location_id)) then
    raise exception 'PORTAL_DENIED: no scope on handover location';
  end if;

  insert into public.portal_handovers(location_id, handover_type, period_from, period_to, status,
                                      handed_over_by, received_by_name, submitted_at, confirmed_at, notes)
    values (p_location_id, 'physical_cash', p_period_from, p_period_to, 'confirmed',
            v_uid, p_received_by_name, now(), now(), p_notes)
    returning id into v_handover;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_cur    := (v_line->>'currency')::portal_currency;
    v_actual := coalesce((v_line->>'actual_delivered_amount')::numeric, 0);

    -- per-purpose book amounts: physical cash, this currency/period, not yet handed over
    select
      coalesce(sum(actual_collected_amount) filter (where collection_purpose = 'cash_case_payment'), 0),
      coalesce(sum(actual_collected_amount) filter (where collection_purpose = 'patient_excess'), 0)
      into v_cash, v_excess
      from public.portal_collections
      where collection_location_id = p_location_id and treasury_channel = 'physical_cash'
        and actual_currency = v_cur and status = 'recorded' and handover_id is null
        and collected_at::date between p_period_from and p_period_to;
    v_book := v_cash + v_excess;   -- drawer expected = cash-case + insurance-excess (excess INCLUDED)

    insert into public.portal_cash_handover_lines(
        handover_id, currency, book_amount, cash_case_book_amount, patient_excess_book_amount,
        actual_delivered_amount, difference, result)
      values (v_handover, v_cur, v_book, v_cash, v_excess, v_actual, round(v_actual - v_book, 2),
              case when round(v_actual - v_book, 2) = 0 then 'match'
                   when v_actual > v_book then 'over' else 'shortage' end);

    -- link + mark BOTH purposes handed over (excess is NOT excluded)
    update public.portal_collections
      set status = 'handed_over', handover_id = v_handover, updated_at = now()
      where collection_location_id = p_location_id and treasury_channel = 'physical_cash'
        and actual_currency = v_cur and status = 'recorded' and handover_id is null
        and collected_at::date between p_period_from and p_period_to;

    if v_book > 0 then
      insert into public.portal_treasury_movements(treasury_account_id, movement_type, direction, amount, currency, handover_id, created_by, description)
        select ta.id, 'cash_handover', 'out', v_book, v_cur, v_handover, v_uid,
               'Cash handover '||p_period_from||'..'||p_period_to||' (cash '||v_cash||' + excess '||v_excess||')'
        from public.portal_treasury_accounts ta
        where ta.location_id = p_location_id and ta.currency = v_cur and ta.channel = 'physical_cash' and ta.active
        limit 1;
    end if;
  end loop;

  perform public.portal_audit('handover', v_handover, 'create_cash_handover', p_location_id, null, null, p_lines);
  return v_handover;
end $$;
revoke all on function public.portal_make_cash_handover(uuid,date,date,jsonb,text,text) from public, anon;
grant execute on function public.portal_make_cash_handover(uuid,date,date,jsonb,text,text) to authenticated;

-- (e) VISA confirm RPC — faithful reproduction of the live 3-arg body + voucher/slip
--     reference + handover_id link on the collection. Drop the old 3-arg overload so a
--     single (4-arg, last param defaulted) version exists; 3-arg callers still work.
drop function if exists public.portal_confirm_visa_handover(uuid,uuid,numeric);
create or replace function public.portal_confirm_visa_handover(
  p_handover_id uuid, p_collection_id uuid, p_actual_egp_amount numeric,
  p_voucher_reference text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_loc uuid; v_account uuid; v_txn uuid; v_existing portal_confirmation_status;
begin
  select location_id into v_loc from public.portal_handovers where id = p_handover_id;
  if v_loc is null then raise exception 'PORTAL_NOTFOUND: handover'; end if;
  if not public.portal_has_location(v_loc) then raise exception 'PORTAL_DENIED: no scope on handover location'; end if;
  select confirmation_status into v_existing from public.portal_visa_handover_transactions
    where handover_id = p_handover_id and collection_id = p_collection_id;
  if v_existing = 'confirmed' then raise exception 'PORTAL_RULE: visa transaction already confirmed'; end if;
  insert into public.portal_visa_handover_transactions
      (handover_id, collection_id, actual_egp_amount, confirmation_status, confirmed_by, confirmed_at, voucher_reference)
    values (p_handover_id, p_collection_id, p_actual_egp_amount, 'confirmed', auth.uid(), now(), p_voucher_reference)
    on conflict (handover_id, collection_id) do update set
      confirmation_status = 'confirmed', actual_egp_amount = excluded.actual_egp_amount,
      confirmed_by = auth.uid(), confirmed_at = now(),
      voucher_reference = coalesce(excluded.voucher_reference, portal_visa_handover_transactions.voucher_reference)
    returning id into v_txn;
  update public.portal_collections set status = 'handed_over', handover_id = p_handover_id
    where id = p_collection_id and treasury_channel = 'visa_bank';
  select id into v_account from public.portal_treasury_accounts
    where location_id = v_loc and currency = 'EGP' and channel = 'visa_bank';
  if v_account is not null then
    insert into public.portal_treasury_movements (treasury_account_id, movement_type, direction, amount, currency, collection_id, handover_id, description, created_by)
      values (v_account, 'visa_handover', 'out', p_actual_egp_amount, 'EGP', p_collection_id, p_handover_id, 'Visa handover confirmed', auth.uid());
  end if;
  perform public.portal_audit('visa_handover_transaction', v_txn, 'confirmed', v_loc, null,
                              jsonb_build_object('egp', p_actual_egp_amount, 'voucher', p_voucher_reference));
  return v_txn;
end $$;
revoke all on function public.portal_confirm_visa_handover(uuid,uuid,numeric,text) from public, anon;
grant execute on function public.portal_confirm_visa_handover(uuid,uuid,numeric,text) to authenticated;

-- VERIFY (run the cash RPC inside a transaction and ROLLBACK to test safely):
--   select column_name from information_schema.columns where table_name='portal_collections' and column_name='handover_id';
--   select proname from pg_proc where proname in ('portal_make_cash_handover','portal_confirm_visa_handover');
--   -- pre-flight: confirm a physical_cash treasury account exists per branch/currency
--   select location_id, currency, channel from public.portal_treasury_accounts where channel='physical_cash' order by 1,2;
--   -- report: per-purpose split for a handover
--   select c.actual_currency, c.collection_purpose, sum(c.actual_collected_amount)
--     from public.portal_collections c where c.handover_id = '<id>' group by 1,2 order by 1,2;
