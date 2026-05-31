-- =====================================================================
-- 008_portal_functions_triggers.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   (1) RLS helper functions (SECURITY DEFINER, used by 009 policies).
--   (2) Append-only audit helper.
--   (3) Secure balance helpers + security-invoker balance view.
--   (4) Secure business transactions that must not be trusted to the
--       frontend: record_collection, record_expense, confirm_visa_handover,
--       record_nurse_shift / end_nurse_shift / record_doctor_duty.
--   (5) PROVISIONAL OUR-Ref reservation (disabled by default — see notes).
--
-- AFFECTED OBJECTS
--   functions (public.portal_*): see body. No tables altered.
--
-- SAFETY
--   Additive. SECURITY DEFINER functions lock search_path and perform their
--   own authorization (portal_has_location / portal_is_admin). They never
--   expose admin-only insurance billing preparation to non-admins.
--
-- ROLLBACK
--   drop the listed functions / view (see end of file comment).
--
-- VERIFICATION
--   select proname from pg_proc where proname like 'portal_%' order by 1;
-- =====================================================================

-- =====================================================================
-- (1) RLS HELPERS
-- =====================================================================
create or replace function public.portal_current_role()
returns text
language sql stable security definer set search_path = public, pg_temp
as $$
  select p.role::text
  from public.portal_user_profiles p
  where p.user_id = auth.uid() and p.active = true
$$;

create or replace function public.portal_is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.portal_user_profiles p
    where p.user_id = auth.uid() and p.active = true and p.role = 'admin'
  )
$$;

create or replace function public.portal_is_active_user()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.portal_user_profiles p
    where p.user_id = auth.uid() and p.active = true
  )
$$;

-- Admin → all locations. Otherwise must have an active scope row.
create or replace function public.portal_has_location(p_location_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select public.portal_is_admin()
      or exists (
        select 1 from public.portal_user_location_scopes s
        where s.user_id = auth.uid() and s.active = true and s.location_id = p_location_id
      )
$$;

comment on function public.portal_has_location(uuid) is
  'P3A RLS helper: true if current user is admin or has an active scope on the location.';

-- =====================================================================
-- (2) AUDIT HELPER (append-only insert)
-- =====================================================================
create or replace function public.portal_audit(
  p_entity_type text,
  p_entity_id   uuid,
  p_action      text,
  p_location_id uuid default null,
  p_before      jsonb default null,
  p_after       jsonb default null,
  p_metadata    jsonb default null
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.portal_audit_log
    (actor_user_id, actor_role, location_id, entity_type, entity_id, action, before_data, after_data, metadata)
  values
    (auth.uid(), public.portal_current_role(), p_location_id, p_entity_type, p_entity_id, p_action, p_before, p_after, p_metadata);
end;
$$;

-- =====================================================================
-- (3) BALANCE HELPERS + VIEW
-- =====================================================================
create or replace function public.portal_account_balance(p_account_id uuid)
returns numeric
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(sum(case when direction = 'in' then amount else -amount end), 0)::numeric(14,2)
  from public.portal_treasury_movements
  where treasury_account_id = p_account_id
$$;

-- Security-invoker view → underlying RLS still applies to the querying user.
create or replace view public.portal_treasury_balances
with (security_invoker = true) as
  select a.id            as treasury_account_id,
         a.location_id,
         a.currency,
         a.channel,
         coalesce(sum(case when m.direction = 'in' then m.amount else -m.amount end), 0)::numeric(14,2) as balance
  from public.portal_treasury_accounts a
  left join public.portal_treasury_movements m on m.treasury_account_id = a.id
  group by a.id, a.location_id, a.currency, a.channel;

comment on view public.portal_treasury_balances is
  'P3A: derived balances from the movements ledger. security_invoker so caller RLS applies.';

-- =====================================================================
-- (4) SECURE BUSINESS TRANSACTIONS
-- =====================================================================

-- ---- Record a collection (cash or visa) --------------------------------
create or replace function public.portal_record_collection(
  p_case_id                uuid,
  p_collection_purpose     portal_collection_purpose,
  p_payment_method         portal_payment_method,
  p_invoice_currency       portal_currency,
  p_foreign_amount_covered numeric,
  p_actual_currency        portal_currency,
  p_fx_rate                numeric,
  p_collection_location_id uuid,
  p_charge_id              uuid default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_channel    portal_treasury_channel;
  v_actual_amt numeric(14,2);
  v_account_id uuid;
  v_collection_id uuid;
begin
  if not public.portal_has_location(p_collection_location_id) then
    raise exception 'PORTAL_DENIED: no scope on collection location';
  end if;

  if p_payment_method = 'visa_card' then
    v_channel := 'visa_bank';
    if p_actual_currency <> 'EGP' then
      raise exception 'PORTAL_RULE: Visa/Card settles in EGP only';
    end if;
    if p_fx_rate is null or p_fx_rate <= 0 then
      raise exception 'PORTAL_RULE: FX rate required for Visa/Card';
    end if;
    v_actual_amt := round(p_foreign_amount_covered * p_fx_rate, 2);
  else
    v_channel := 'physical_cash';
    if p_actual_currency = p_invoice_currency then
      v_actual_amt := round(p_foreign_amount_covered, 2);  -- same currency, no FX
    else
      if p_fx_rate is null or p_fx_rate <= 0 then
        raise exception 'PORTAL_RULE: FX rate required for cross-currency cash';
      end if;
      v_actual_amt := round(p_foreign_amount_covered * p_fx_rate, 2);
    end if;
  end if;

  insert into public.portal_collections (
    case_id, charge_id, collection_purpose, payment_method, invoice_currency,
    foreign_amount_covered, actual_currency, fx_rate, actual_collected_amount,
    treasury_channel, collection_location_id, collected_by, collected_at, status
  ) values (
    p_case_id, p_charge_id, p_collection_purpose, p_payment_method, p_invoice_currency,
    p_foreign_amount_covered, p_actual_currency, p_fx_rate, v_actual_amt,
    v_channel, p_collection_location_id, auth.uid(), now(), 'recorded'
  ) returning id into v_collection_id;

  select id into v_account_id from public.portal_treasury_accounts
    where location_id = p_collection_location_id and currency = p_actual_currency and channel = v_channel;
  if v_account_id is null then
    raise exception 'PORTAL_CONFIG: missing treasury account %/%/%', p_collection_location_id, p_actual_currency, v_channel;
  end if;

  insert into public.portal_treasury_movements (
    treasury_account_id, movement_type, direction, amount, currency,
    case_id, collection_id, description, created_by
  ) values (
    v_account_id, 'collection', 'in', v_actual_amt, p_actual_currency,
    p_case_id, v_collection_id, 'Collection ' || p_collection_purpose::text, auth.uid()
  );

  perform public.portal_audit('collection', v_collection_id, 'recorded', p_collection_location_id,
    null, jsonb_build_object('amount', v_actual_amt, 'currency', p_actual_currency, 'channel', v_channel));
  return v_collection_id;
end;
$$;

-- ---- Record an expense (physical cash, same-currency, balance-checked) --
create or replace function public.portal_record_expense(
  p_location_id uuid,
  p_currency    portal_currency,
  p_amount      numeric,
  p_category    text,
  p_description text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_allows   boolean;
  v_account  uuid;
  v_balance  numeric(14,2);
  v_expense  uuid;
begin
  if not public.portal_has_location(p_location_id) then
    raise exception 'PORTAL_DENIED: no scope on location';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'PORTAL_RULE: expense amount must be positive';
  end if;

  select allows_expenses into v_allows from public.portal_locations where id = p_location_id;
  if not coalesce(v_allows, false) then
    raise exception 'PORTAL_RULE: expenses not permitted at this location';
  end if;

  select id into v_account from public.portal_treasury_accounts
    where location_id = p_location_id and currency = p_currency and channel = 'physical_cash';
  if v_account is null then
    raise exception 'PORTAL_CONFIG: missing physical_cash account for %/%', p_location_id, p_currency;
  end if;

  v_balance := public.portal_account_balance(v_account);
  if v_balance < p_amount then
    raise exception 'PORTAL_RULE: insufficient physical cash (% available, % requested)', v_balance, p_amount;
  end if;

  insert into public.portal_expenses (location_id, currency, amount, category, description, created_by, paid_from_channel, status)
  values (p_location_id, p_currency, p_amount, p_category, p_description, auth.uid(), 'physical_cash', 'recorded')
  returning id into v_expense;

  insert into public.portal_treasury_movements (treasury_account_id, movement_type, direction, amount, currency, expense_id, description, created_by)
  values (v_account, 'expense', 'out', p_amount, p_currency, v_expense, coalesce(p_category,'expense'), auth.uid());

  perform public.portal_audit('expense', v_expense, 'recorded', p_location_id,
    null, jsonb_build_object('amount', p_amount, 'currency', p_currency));
  return v_expense;
end;
$$;

-- ---- Confirm a Visa handover transaction (once) ------------------------
create or replace function public.portal_confirm_visa_handover(
  p_handover_id uuid,
  p_collection_id uuid,
  p_actual_egp_amount numeric
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_loc uuid;
  v_account uuid;
  v_txn uuid;
  v_existing portal_confirmation_status;
begin
  select location_id into v_loc from public.portal_handovers where id = p_handover_id;
  if v_loc is null then raise exception 'PORTAL_NOTFOUND: handover'; end if;
  if not public.portal_has_location(v_loc) then raise exception 'PORTAL_DENIED: no scope on handover location'; end if;

  select confirmation_status into v_existing from public.portal_visa_handover_transactions
    where handover_id = p_handover_id and collection_id = p_collection_id;
  if v_existing = 'confirmed' then
    raise exception 'PORTAL_RULE: visa transaction already confirmed';
  end if;

  insert into public.portal_visa_handover_transactions (handover_id, collection_id, actual_egp_amount, confirmation_status, confirmed_by, confirmed_at)
  values (p_handover_id, p_collection_id, p_actual_egp_amount, 'confirmed', auth.uid(), now())
  on conflict (handover_id, collection_id)
  do update set confirmation_status = 'confirmed', actual_egp_amount = excluded.actual_egp_amount,
               confirmed_by = auth.uid(), confirmed_at = now()
  returning id into v_txn;

  update public.portal_collections set status = 'handed_over'
    where id = p_collection_id and treasury_channel = 'visa_bank';

  select id into v_account from public.portal_treasury_accounts
    where location_id = v_loc and currency = 'EGP' and channel = 'visa_bank';
  if v_account is not null then
    insert into public.portal_treasury_movements (treasury_account_id, movement_type, direction, amount, currency, collection_id, handover_id, description, created_by)
    values (v_account, 'visa_handover', 'out', p_actual_egp_amount, 'EGP', p_collection_id, p_handover_id, 'Visa handover confirmed', auth.uid());
  end if;

  perform public.portal_audit('visa_handover_transaction', v_txn, 'confirmed', v_loc,
    null, jsonb_build_object('egp', p_actual_egp_amount));
  return v_txn;
end;
$$;

-- ---- Attendance: nurse shift start / end -------------------------------
create or replace function public.portal_record_nurse_shift(
  p_location_id uuid,
  p_staff_id    uuid,
  p_work_date   date,
  p_shift_start_at timestamptz default now()
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_shift uuid;
begin
  if not public.portal_has_location(p_location_id) then raise exception 'PORTAL_DENIED: no scope on location'; end if;
  if not exists (
    select 1 from public.portal_staff st
    join public.portal_staff_location_assignments a on a.staff_id = st.id
    where st.id = p_staff_id and st.active = true and st.staff_role = 'nurse'
      and a.location_id = p_location_id and a.assignment_role = 'nurse' and a.active = true
  ) then
    raise exception 'PORTAL_RULE: staff is not an active nurse assigned to this location';
  end if;

  insert into public.portal_nurse_shifts (location_id, staff_id, work_date, shift_start_at, status, recorded_by)
  values (p_location_id, p_staff_id, p_work_date, p_shift_start_at, 'active', auth.uid())
  returning id into v_shift;
  perform public.portal_audit('nurse_shift', v_shift, 'started', p_location_id);
  return v_shift;
end;
$$;

create or replace function public.portal_end_nurse_shift(p_shift_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_loc uuid; v_start timestamptz;
begin
  select location_id, shift_start_at into v_loc, v_start from public.portal_nurse_shifts where id = p_shift_id;
  if v_loc is null then raise exception 'PORTAL_NOTFOUND: shift'; end if;
  if not public.portal_has_location(v_loc) then raise exception 'PORTAL_DENIED: no scope'; end if;
  update public.portal_nurse_shifts
    set shift_end_at = now(),
        worked_minutes = greatest(0, round(extract(epoch from (now() - v_start)) / 60.0))::int,
        status = 'completed'
    where id = p_shift_id;
  perform public.portal_audit('nurse_shift', p_shift_id, 'ended', v_loc);
end;
$$;

create or replace function public.portal_record_doctor_duty(
  p_location_id uuid,
  p_staff_id    uuid,
  p_work_date   date,
  p_note        text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_duty uuid;
begin
  if not public.portal_has_location(p_location_id) then raise exception 'PORTAL_DENIED: no scope on location'; end if;
  if not exists (
    select 1 from public.portal_staff st
    join public.portal_staff_location_assignments a on a.staff_id = st.id
    where st.id = p_staff_id and st.active = true and st.staff_role = 'doctor'
      and a.location_id = p_location_id and a.assignment_role = 'doctor' and a.active = true
  ) then
    raise exception 'PORTAL_RULE: staff is not an active doctor assigned to this location';
  end if;

  insert into public.portal_doctor_daily_duty (location_id, staff_id, work_date, note, recorded_by)
  values (p_location_id, p_staff_id, p_work_date, p_note, auth.uid())
  on conflict (location_id, work_date, staff_id) do update set note = excluded.note, updated_at = now()
  returning id into v_duty;
  perform public.portal_audit('doctor_daily_duty', v_duty, 'recorded', p_location_id);
  return v_duty;
end;
$$;

-- =====================================================================
-- (5) PROVISIONAL OUR-Ref reservation — DISABLED by default
-- ---------------------------------------------------------------------
-- The production OUR Ref format is NOT proven against the real Master Sheet
-- in this sprint (see PORTAL_REFERENCE_FORMAT_EVIDENCE.md). This function
-- builds the counter mechanics + uniqueness, but emits a CLEARLY PROVISIONAL
-- value prefixed 'PROV-'. portal_create_case_with_ref() does NOT call it
-- unless p_assign_provisional_ref => true. The uuid PK is the guaranteed
-- identity until Mohamed approves the final format.
-- =====================================================================
create or replace function public.portal_reserve_case_ref(
  p_counter_key text
) returns bigint
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_num bigint;
begin
  insert into public.portal_case_reference_counters (counter_key, next_number)
  values (p_counter_key, 1)
  on conflict (counter_key) do update set next_number = public.portal_case_reference_counters.next_number + 1,
                                          updated_at = now()
  returning next_number into v_num;
  return v_num;
end;
$$;

create or replace function public.portal_create_case_with_ref(
  p_patient_id             uuid,
  p_registered_location_id uuid,
  p_encounter_pattern      portal_encounter_pattern,
  p_visit_date             date,
  p_financial_type         portal_financial_type default 'pending',
  p_route                  portal_route_type default 'direct',
  p_assign_provisional_ref boolean default false
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_case uuid;
  v_ref  text;
  v_seq  bigint;
begin
  if not public.portal_has_location(p_registered_location_id) then
    raise exception 'PORTAL_DENIED: no scope on registered location';
  end if;

  insert into public.portal_cases (
    patient_id, registered_location_id, current_location_id, encounter_pattern,
    financial_type, route, visit_date, operational_status, created_by
  ) values (
    p_patient_id, p_registered_location_id, p_registered_location_id, p_encounter_pattern,
    p_financial_type, p_route, p_visit_date, 'open', auth.uid()
  ) returning id into v_case;

  if p_assign_provisional_ref then
    v_seq := public.portal_reserve_case_ref('PROVISIONAL:' || to_char(now(), 'YYYY'));
    v_ref := 'PROV-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
    update public.portal_cases set our_ref = v_ref where id = v_case;
  end if;

  perform public.portal_audit('case', v_case, 'created', p_registered_location_id,
    null, jsonb_build_object('our_ref', v_ref, 'provisional', p_assign_provisional_ref));
  return v_case;
end;
$$;

-- =====================================================================
-- EXECUTE grants — business functions callable by authenticated users.
-- (Authorization is enforced INSIDE each function.)
-- =====================================================================
grant execute on function
  public.portal_record_collection(uuid, portal_collection_purpose, portal_payment_method, portal_currency, numeric, portal_currency, numeric, uuid, uuid),
  public.portal_record_expense(uuid, portal_currency, numeric, text, text),
  public.portal_confirm_visa_handover(uuid, uuid, numeric),
  public.portal_record_nurse_shift(uuid, uuid, date, timestamptz),
  public.portal_end_nurse_shift(uuid),
  public.portal_record_doctor_duty(uuid, uuid, date, text),
  public.portal_create_case_with_ref(uuid, uuid, portal_encounter_pattern, date, portal_financial_type, portal_route_type, boolean)
to authenticated;

-- Helper/read functions
grant execute on function
  public.portal_current_role(),
  public.portal_is_admin(),
  public.portal_is_active_user(),
  public.portal_has_location(uuid),
  public.portal_account_balance(uuid)
to authenticated;

-- ROLLBACK NOTE: drop function ... for each of the above + drop view
-- public.portal_treasury_balances;
