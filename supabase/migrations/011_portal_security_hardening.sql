-- =====================================================================
-- 011_portal_security_hardening.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   Address Supabase security-advisor findings after 001–010:
--   (a) Lock search_path on the updated_at trigger function.
--   (b) Add explicit admin-only policy to portal_case_reference_counters
--       (was RLS-enabled-no-policy = deny-all; now explicit + lint-clean).
--   (c) Tighten three UPDATE policies that used WITH CHECK (true) so the
--       post-update row must remain within the user's scope.
--   (d) Least-privilege function grants: REVOKE EXECUTE from PUBLIC + anon
--       on all portal_ functions; revoke direct EXECUTE from authenticated
--       on internal-only / leak-prone helpers (portal_audit,
--       portal_reserve_case_ref, portal_account_balance, portal_set_updated_at).
--       Business functions + caller-only boolean helpers remain executable
--       by authenticated (they perform internal authorization).
--
-- SAFETY
--   Additive/again-idempotent. Tightens access only. No data touched.
--
-- ROLLBACK
--   Re-grant as needed; re-create prior policy variants. (Not recommended —
--   this migration only removes excess privilege.)
--
-- NOTE (not fixable via SQL): enable "Leaked Password Protection" in the
--   Supabase Auth dashboard before any production login (P3B).
-- =====================================================================

-- (a) trigger fn search_path
alter function public.portal_set_updated_at() set search_path = public, pg_temp;

-- (b) reference counters explicit admin-only policy
drop policy if exists portal_ref_counters_admin on public.portal_case_reference_counters;
create policy portal_ref_counters_admin on public.portal_case_reference_counters
  for all to authenticated using (public.portal_is_admin()) with check (public.portal_is_admin());

-- (c) tighten UPDATE WITH CHECK (true)
drop policy if exists portal_cases_upd on public.portal_cases;
create policy portal_cases_upd on public.portal_cases for update to authenticated
  using (
    public.portal_is_admin()
    or public.portal_has_location(registered_location_id)
    or public.portal_has_location(current_location_id)
    or exists (select 1 from public.portal_transfers t where t.case_id = portal_cases.id and public.portal_has_location(t.to_location_id))
  )
  with check (
    public.portal_is_admin()
    or public.portal_has_location(registered_location_id)
    or public.portal_has_location(current_location_id)
  );

drop policy if exists portal_patients_upd on public.portal_patients;
create policy portal_patients_upd on public.portal_patients for update to authenticated
  using (
    public.portal_is_admin() or created_by = auth.uid()
    or exists (select 1 from public.portal_cases c where c.patient_id = portal_patients.id and public.portal_can_access_case(c.id))
  )
  with check (
    public.portal_is_admin() or created_by = auth.uid()
    or exists (select 1 from public.portal_cases c where c.patient_id = portal_patients.id and public.portal_can_access_case(c.id))
  );

drop policy if exists portal_transfers_upd on public.portal_transfers;
create policy portal_transfers_upd on public.portal_transfers for update to authenticated
  using (public.portal_is_admin() or public.portal_has_location(from_location_id) or public.portal_has_location(to_location_id))
  with check (public.portal_is_admin() or public.portal_has_location(from_location_id) or public.portal_has_location(to_location_id));

-- (d) least-privilege function grants
do $$ declare r record;
begin
  for r in select p.proname, pg_get_function_identity_arguments(p.oid) as args
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'portal_%'
  loop
    execute format('revoke all on function public.%I(%s) from public, anon;', r.proname, r.args);
  end loop;
end$$;

-- internal-only / leak-prone helpers: also remove direct authenticated EXECUTE.
-- (These run inside SECURITY DEFINER functions as owner, or via triggers, so
--  clients never need to call them directly. Balances are read via the
--  RLS-protected view portal_treasury_balances instead.)
revoke all on function public.portal_audit(text, uuid, text, uuid, jsonb, jsonb, jsonb) from authenticated;
revoke all on function public.portal_reserve_case_ref(text) from authenticated;
revoke all on function public.portal_account_balance(uuid) from authenticated;
revoke all on function public.portal_set_updated_at() from authenticated;
