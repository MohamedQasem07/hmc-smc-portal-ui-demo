-- =====================================================================
-- portal_security_verification.sql  (P3A)
-- ---------------------------------------------------------------------
-- Run AFTER migrations 001–010 in a SAFE isolated Portal project.
-- Each block impersonates a persona via JWT claims, then asserts what is
-- visible / permitted. Run block-by-block and compare to the expected
-- comments. Nothing here writes permanent data (writes are rolled back).
-- =====================================================================

-- ---- #1–4 ADMIN ----------------------------------------------------------
begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select 'admin_locations'  as test, count(*) as n from public.portal_locations;                       -- expect 8
  select 'admin_cases'      as test, count(*) as n from public.portal_cases;                           -- expect all
  select 'admin_ins_prep'   as test, count(*) as n from public.portal_insurance_billing_preparations;  -- allowed (>=0)
  select 'admin_balances'   as test, count(*) as n from public.portal_treasury_balances;               -- all accounts
rollback;

-- ---- #5,6,9,10 TROPITEL --------------------------------------------------
begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select 'tropitel_cases'    as test, count(*) as n from public.portal_cases;                          -- only tropitel-scoped
  select 'tropitel_ins_prep' as test, count(*) as n from public.portal_insurance_billing_preparations; -- EXPECT 0 (denied)
  select 'tropitel_staff'    as test, count(*) as n from public.portal_staff;                          -- only tropitel-assigned
  -- cases registered at romance must be invisible:
  select 'tropitel_sees_romance' as test, count(*) as n
    from public.portal_cases c join public.portal_locations l on l.id=c.registered_location_id
    where l.code='romance';                                                                            -- EXPECT 0
rollback;

-- ---- #7,8 TROPITEL insert scope (write check) ----------------------------
begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  -- allowed: insert a case at Tropitel
  insert into public.portal_cases (patient_id, registered_location_id, current_location_id, encounter_pattern, financial_type, route, visit_date, created_by)
  select 'd0000000-0000-4000-8000-000000000001', l.id, l.id, 'outpatient_single','cash','direct',current_date,'c0000000-0000-4000-8000-000000000001'
  from public.portal_locations l where l.code='tropitel';
  select 'tropitel_insert_own' as test, 'OK' as result;                                                -- expect OK
rollback;

begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  -- blocked: insert a case at Romance → should raise RLS violation
  do $$
  begin
    insert into public.portal_cases (patient_id, registered_location_id, current_location_id, encounter_pattern, financial_type, route, visit_date, created_by)
    select 'd0000000-0000-4000-8000-000000000001', l.id, l.id, 'outpatient_single','cash','direct',current_date,'c0000000-0000-4000-8000-000000000001'
    from public.portal_locations l where l.code='romance';
    raise notice 'UNEXPECTED: insert at Romance succeeded';
  exception when others then
    raise notice 'EXPECTED block: %', sqlerrm;
  end$$;
rollback;

-- ---- #11 ROMANCE isolation ----------------------------------------------
begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select 'romance_sees_tropitel' as test, count(*) as n
    from public.portal_cases c join public.portal_locations l on l.id=c.registered_location_id
    where l.code='tropitel';                                                                           -- EXPECT 0
rollback;

-- ---- #13,14 BRANCH isolation --------------------------------------------
begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select 'kawther_sees_sheraton' as test, count(*) as n
    from public.portal_cases c join public.portal_locations l on l.id=c.current_location_id
    where l.code='sheraton';                                                                           -- EXPECT 0
rollback;

-- ---- #15 ANON denial -----------------------------------------------------
begin;
  set local role anon;
  select 'anon_cases'    as test, count(*) as n from public.portal_cases;        -- EXPECT 0 (or permission denied)
  select 'anon_patients' as test, count(*) as n from public.portal_patients;     -- EXPECT 0
rollback;

-- ---- #16,17 record_collection scope -------------------------------------
begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  -- allowed at Tropitel
  select 'collect_tropitel' as test,
         public.portal_record_collection(
           'e0000000-0000-4000-8000-000000000001','cash_case_payment','cash','EUR',100,'EUR',null,
           (select id from public.portal_locations where code='tropitel')
         ) is not null as ok;                                                                          -- expect true
rollback;

begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $$
  begin
    perform public.portal_record_collection(
      'e0000000-0000-4000-8000-000000000001','cash_case_payment','cash','EUR',100,'EUR',null,
      (select id from public.portal_locations where code='romance'));
    raise notice 'UNEXPECTED: collection at Romance succeeded';
  exception when others then
    raise notice 'EXPECTED block: %', sqlerrm;                                                         -- PORTAL_DENIED
  end$$;
rollback;

-- ---- #18 expense balance rule -------------------------------------------
begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $$
  begin
    perform public.portal_record_expense((select id from public.portal_locations where code='tropitel'),'EGP',999999,'TEST overspend');
    raise notice 'UNEXPECTED: overspend succeeded';
  exception when others then
    raise notice 'EXPECTED block: %', sqlerrm;                                                         -- insufficient cash
  end$$;
rollback;

-- ---- #20 attendance assignment rule -------------------------------------
begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $$
  begin
    -- Romance nurse is NOT assigned to Tropitel → must fail
    perform public.portal_record_nurse_shift(
      (select id from public.portal_locations where code='tropitel'),
      (select id from public.portal_staff where staff_code='TEST-RO-NUR-001'),
      current_date);
    raise notice 'UNEXPECTED: cross-location nurse shift succeeded';
  exception when others then
    raise notice 'EXPECTED block: %', sqlerrm;
  end$$;
rollback;

-- ---- #21,22 immutable/admin-only direct writes --------------------------
begin;
  set local role authenticated;
  select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $$
  begin
    insert into public.portal_audit_log (entity_type, action) values ('hack','tamper');
    raise notice 'UNEXPECTED: audit insert by clinic user succeeded';
  exception when others then
    raise notice 'EXPECTED block: %', sqlerrm;
  end$$;
rollback;
