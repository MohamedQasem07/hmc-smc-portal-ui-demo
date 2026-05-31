-- =====================================================================
-- 009_portal_rls_policies.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   Grant base privileges to `authenticated`, REVOKE everything from
--   `anon`, and define all Row-Level Security policies. RLS was already
--   ENABLED at table-creation time (002–007); until this migration the
--   tables were closed (no policy = deny). This migration opens the
--   correct, minimal access per role.
--
-- ACCESS MODEL
--   admin              → full access everywhere (portal_is_admin()).
--   clinic_user /
--   reception_user     → location-scoped via portal_has_location() and
--                        portal_can_access_case().
--   anon / inactive    → NO access to any portal_ table.
--
-- PRIVACY
--   portal_insurance_billing_preparations → ADMIN ONLY (no non-admin SELECT).
--   portal_audit_log + portal_treasury_movements → append-only / immutable
--     (no UPDATE/DELETE policy for anyone; inserts via SECURITY DEFINER fns).
--
-- SAFETY
--   Additive (policies + grants). Reversible by dropping policies.
--
-- VERIFICATION
--   select tablename, count(*) from pg_policies where schemaname='public'
--     and tablename like 'portal_%' group by 1 order by 1;
-- =====================================================================

-- ---------------------------------------------------------------------
-- Base privileges: authenticated gets DML (RLS gates rows); anon gets none.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' and tablename like 'portal_%'
  loop
    execute format('revoke all on public.%I from anon;', r.tablename);
    execute format('grant select, insert, update, delete on public.%I to authenticated;', r.tablename);
  end loop;
end$$;

revoke all on public.portal_treasury_balances from anon;
grant select on public.portal_treasury_balances to authenticated;

-- ---------------------------------------------------------------------
-- Case-access helper (centralises scope logic across child tables)
-- ---------------------------------------------------------------------
create or replace function public.portal_can_access_case(p_case_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select public.portal_is_admin()
    or exists (
      select 1 from public.portal_cases c
      where c.id = p_case_id
        and (public.portal_has_location(c.registered_location_id)
             or public.portal_has_location(c.current_location_id))
    )
    or exists (
      select 1 from public.portal_transfers t
      where t.case_id = p_case_id and public.portal_has_location(t.to_location_id)
    )
$$;
grant execute on function public.portal_can_access_case(uuid) to authenticated;

-- =====================================================================
-- REFERENCE TABLES — read by any active user; write admin-only
--   billing_facilities, locations, rooms, local_assistance_companies
-- =====================================================================
create policy portal_billing_facilities_sel on public.portal_billing_facilities
  for select to authenticated using (public.portal_is_active_user());
create policy portal_billing_facilities_admin on public.portal_billing_facilities
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

create policy portal_locations_sel on public.portal_locations
  for select to authenticated using (public.portal_is_active_user());
create policy portal_locations_admin on public.portal_locations
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

create policy portal_rooms_sel on public.portal_rooms
  for select to authenticated using (public.portal_is_active_user());
create policy portal_rooms_admin on public.portal_rooms
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

create policy portal_localassist_sel on public.portal_local_assistance_companies
  for select to authenticated using (public.portal_is_admin());
create policy portal_localassist_admin on public.portal_local_assistance_companies
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- Insurer catalogue: any active user may read + add (intake flow); edit/delete admin.
create policy portal_insurers_sel on public.portal_insurance_companies
  for select to authenticated using (public.portal_is_active_user());
create policy portal_insurers_ins on public.portal_insurance_companies
  for insert to authenticated with check (public.portal_is_active_user());
create policy portal_insurers_upd on public.portal_insurance_companies
  for update to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());
create policy portal_insurers_del on public.portal_insurance_companies
  for delete to authenticated using (public.portal_is_admin());

-- =====================================================================
-- STAFF / USERS / SCOPES
-- =====================================================================
-- Staff master: visible if admin or assigned to a location the user scopes.
create policy portal_staff_sel on public.portal_staff
  for select to authenticated using (
    public.portal_is_admin()
    or exists (
      select 1 from public.portal_staff_location_assignments a
      where a.staff_id = portal_staff.id and a.active and public.portal_has_location(a.location_id)
    )
  );
create policy portal_staff_admin on public.portal_staff
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- Assignments: visible if admin or scoped location; write admin only.
create policy portal_staff_assign_sel on public.portal_staff_location_assignments
  for select to authenticated using (public.portal_is_admin() or public.portal_has_location(location_id));
create policy portal_staff_assign_admin on public.portal_staff_location_assignments
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- User profiles: own row or admin; write admin only.
create policy portal_user_profiles_sel on public.portal_user_profiles
  for select to authenticated using (user_id = auth.uid() or public.portal_is_admin());
create policy portal_user_profiles_admin on public.portal_user_profiles
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- Location scopes: own rows or admin; write admin only.
create policy portal_user_scopes_sel on public.portal_user_location_scopes
  for select to authenticated using (user_id = auth.uid() or public.portal_is_admin());
create policy portal_user_scopes_admin on public.portal_user_location_scopes
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- =====================================================================
-- PATIENTS / CASES / ENCOUNTERS / TRAVEL / TRANSFERS / ROOMS
-- =====================================================================
-- Patients: scoped through their cases; active users can create.
create policy portal_patients_sel on public.portal_patients
  for select to authenticated using (
    public.portal_is_admin()
    or created_by = auth.uid()
    or exists (
      select 1 from public.portal_cases c
      where c.patient_id = portal_patients.id and public.portal_can_access_case(c.id)
    )
  );
create policy portal_patients_ins on public.portal_patients
  for insert to authenticated with check (public.portal_is_active_user() and created_by = auth.uid());
create policy portal_patients_upd on public.portal_patients
  for update to authenticated using (
    public.portal_is_admin() or created_by = auth.uid()
    or exists (select 1 from public.portal_cases c where c.patient_id = portal_patients.id and public.portal_can_access_case(c.id))
  ) with check (true);
create policy portal_patients_del on public.portal_patients
  for delete to authenticated using (public.portal_is_admin());

-- Cases: scoped by registered/current location or incoming transfer.
create policy portal_cases_sel on public.portal_cases
  for select to authenticated using (
    public.portal_is_admin()
    or public.portal_has_location(registered_location_id)
    or public.portal_has_location(current_location_id)
    or exists (select 1 from public.portal_transfers t where t.case_id = portal_cases.id and public.portal_has_location(t.to_location_id))
  );
create policy portal_cases_ins on public.portal_cases
  for insert to authenticated with check (public.portal_has_location(registered_location_id) and created_by = auth.uid());
create policy portal_cases_upd on public.portal_cases
  for update to authenticated using (
    public.portal_is_admin()
    or public.portal_has_location(registered_location_id)
    or public.portal_has_location(current_location_id)
    or exists (select 1 from public.portal_transfers t where t.case_id = portal_cases.id and public.portal_has_location(t.to_location_id))
  ) with check (true);
create policy portal_cases_del on public.portal_cases
  for delete to authenticated using (public.portal_is_admin());

-- Encounters / travel: follow the parent case.
create policy portal_encounters_sel on public.portal_encounters
  for select to authenticated using (public.portal_can_access_case(case_id));
create policy portal_encounters_cud on public.portal_encounters
  for all to authenticated using (public.portal_can_access_case(case_id)) with check (public.portal_can_access_case(case_id));

create policy portal_travel_sel on public.portal_patient_travel_dates
  for select to authenticated using (public.portal_can_access_case(case_id));
create policy portal_travel_cud on public.portal_patient_travel_dates
  for all to authenticated using (public.portal_can_access_case(case_id)) with check (public.portal_can_access_case(case_id));

-- Transfers: sender (from) or receiver (to) scope, or admin.
create policy portal_transfers_sel on public.portal_transfers
  for select to authenticated using (
    public.portal_is_admin() or public.portal_has_location(from_location_id) or public.portal_has_location(to_location_id)
  );
create policy portal_transfers_ins on public.portal_transfers
  for insert to authenticated with check (public.portal_has_location(from_location_id));
create policy portal_transfers_upd on public.portal_transfers
  for update to authenticated using (
    public.portal_is_admin() or public.portal_has_location(from_location_id) or public.portal_has_location(to_location_id)
  ) with check (true);
create policy portal_transfers_del on public.portal_transfers
  for delete to authenticated using (public.portal_is_admin());

-- Room assignments: scoped by parent case.
create policy portal_room_assign_sel on public.portal_room_assignments
  for select to authenticated using (public.portal_can_access_case(case_id));
create policy portal_room_assign_cud on public.portal_room_assignments
  for all to authenticated using (public.portal_can_access_case(case_id)) with check (public.portal_can_access_case(case_id));

-- =====================================================================
-- INSURANCE — Stage 1 scoped; Stage 2 ADMIN-ONLY
-- =====================================================================
create policy portal_ins_intake_sel on public.portal_insurance_intakes
  for select to authenticated using (public.portal_can_access_case(case_id));
create policy portal_ins_intake_cud on public.portal_insurance_intakes
  for all to authenticated using (public.portal_can_access_case(case_id)) with check (public.portal_can_access_case(case_id));

-- Admin-only. Deliberately NO policy for non-admins → clinic/reception
-- users cannot SELECT/INSERT/UPDATE/DELETE this table at all.
create policy portal_ins_prep_admin on public.portal_insurance_billing_preparations
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- =====================================================================
-- FINANCE — charges scoped; collections/expenses/movements function-driven
-- =====================================================================
-- Case charges: scoped by case.
create policy portal_charges_sel on public.portal_case_charges
  for select to authenticated using (public.portal_can_access_case(case_id));
create policy portal_charges_cud on public.portal_case_charges
  for all to authenticated using (public.portal_can_access_case(case_id)) with check (public.portal_can_access_case(case_id));

-- Collections: SELECT scoped by collection location or case. Writes go
-- through portal_record_collection() (SECURITY DEFINER); direct table writes
-- are admin-only.
create policy portal_collections_sel on public.portal_collections
  for select to authenticated using (
    public.portal_is_admin() or public.portal_has_location(collection_location_id) or public.portal_can_access_case(case_id)
  );
create policy portal_collections_admin on public.portal_collections
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- Treasury accounts: read scoped; write admin (seeded config).
create policy portal_treasury_accounts_sel on public.portal_treasury_accounts
  for select to authenticated using (public.portal_is_admin() or public.portal_has_location(location_id));
create policy portal_treasury_accounts_admin on public.portal_treasury_accounts
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- Treasury movements: SELECT scoped via the account's location. IMMUTABLE —
-- INSERT admin-only (functions bypass RLS); NO update/delete policy = denied.
create policy portal_movements_sel on public.portal_treasury_movements
  for select to authenticated using (
    public.portal_is_admin()
    or exists (select 1 from public.portal_treasury_accounts a where a.id = treasury_account_id and public.portal_has_location(a.location_id))
  );
create policy portal_movements_ins_admin on public.portal_treasury_movements
  for insert to authenticated with check (public.portal_is_admin());

-- Expenses: SELECT scoped; writes via portal_record_expense() (balance-checked).
-- Direct table writes admin-only.
create policy portal_expenses_sel on public.portal_expenses
  for select to authenticated using (public.portal_is_admin() or public.portal_has_location(location_id));
create policy portal_expenses_admin on public.portal_expenses
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- =====================================================================
-- HANDOVERS
-- =====================================================================
create policy portal_handovers_sel on public.portal_handovers
  for select to authenticated using (public.portal_is_admin() or public.portal_has_location(location_id));
create policy portal_handovers_cud on public.portal_handovers
  for all to authenticated using (public.portal_is_admin() or public.portal_has_location(location_id))
  with check (public.portal_is_admin() or public.portal_has_location(location_id));

create policy portal_cash_lines_sel on public.portal_cash_handover_lines
  for select to authenticated using (
    exists (select 1 from public.portal_handovers h where h.id = handover_id and (public.portal_is_admin() or public.portal_has_location(h.location_id)))
  );
create policy portal_cash_lines_cud on public.portal_cash_handover_lines
  for all to authenticated using (
    exists (select 1 from public.portal_handovers h where h.id = handover_id and (public.portal_is_admin() or public.portal_has_location(h.location_id)))
  ) with check (
    exists (select 1 from public.portal_handovers h where h.id = handover_id and (public.portal_is_admin() or public.portal_has_location(h.location_id)))
  );

-- Visa handover transactions: SELECT scoped; confirm via function only.
create policy portal_visa_txn_sel on public.portal_visa_handover_transactions
  for select to authenticated using (
    exists (select 1 from public.portal_handovers h where h.id = handover_id and (public.portal_is_admin() or public.portal_has_location(h.location_id)))
  );
create policy portal_visa_txn_admin on public.portal_visa_handover_transactions
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- =====================================================================
-- ATTENDANCE — SELECT scoped; writes via functions (admin-only at table)
-- =====================================================================
create policy portal_nurse_shifts_sel on public.portal_nurse_shifts
  for select to authenticated using (public.portal_is_admin() or public.portal_has_location(location_id));
create policy portal_nurse_shifts_admin on public.portal_nurse_shifts
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

create policy portal_doctor_duty_sel on public.portal_doctor_daily_duty
  for select to authenticated using (public.portal_is_admin() or public.portal_has_location(location_id));
create policy portal_doctor_duty_admin on public.portal_doctor_daily_duty
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- =====================================================================
-- AUDIT LOG — append-only. SELECT admin-only. Inserts via SECURITY DEFINER
-- portal_audit(); NO update/delete policy = denied for everyone.
-- =====================================================================
create policy portal_audit_sel_admin on public.portal_audit_log
  for select to authenticated using (public.portal_is_admin());
create policy portal_audit_ins_admin on public.portal_audit_log
  for insert to authenticated with check (public.portal_is_admin());
