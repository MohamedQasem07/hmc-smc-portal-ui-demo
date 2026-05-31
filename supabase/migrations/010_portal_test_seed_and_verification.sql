-- =====================================================================
-- 010_portal_test_seed_and_verification.sql
-- ---------------------------------------------------------------------
-- PURPOSE
--   TEST-ONLY fictional seed to exercise RLS + functions. Creates 5 test
--   auth users (admin + 2 clinics + 2 branches), their profiles + scopes,
--   a few test staff + assignments, and one sample patient/case.
--   EVERYTHING here is clearly fictional (emails @portal.test, names "TEST…").
--
-- !!! EXECUTE ONLY IN A SAFE, ISOLATED PORTAL PROJECT (Phase C). !!!
--   Do NOT run against any project containing real data.
--   These rows can be removed with the ROLLBACK block at the end.
--
-- AFFECTED OBJECTS
--   inserts into: auth.users (5 test), portal_user_profiles, portal_user_location_scopes,
--   portal_staff, portal_staff_location_assignments, portal_patients, portal_cases.
--
-- VERIFICATION
--   see supabase/tests/portal_security_verification.sql
-- =====================================================================

-- Fixed, readable test UUIDs ------------------------------------------------
--   admin    : a0000000-0000-4000-8000-000000000001
--   tropitel : c0000000-0000-4000-8000-000000000001
--   romance  : c0000000-0000-4000-8000-000000000002
--   kawther  : b0000000-0000-4000-8000-000000000001
--   sheraton : b0000000-0000-4000-8000-000000000002

-- 1) Test auth users (no password — used for RLS simulation only) -----------
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@portal.test', now(), now()),
  ('c0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tropitel@portal.test', now(), now()),
  ('c0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','romance@portal.test', now(), now()),
  ('b0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','kawther@portal.test', now(), now()),
  ('b0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sheraton@portal.test', now(), now())
on conflict (id) do nothing;

-- 2) Profiles --------------------------------------------------------------
insert into public.portal_user_profiles (user_id, display_name, role) values
  ('a0000000-0000-4000-8000-000000000001','TEST Admin','admin'),
  ('c0000000-0000-4000-8000-000000000001','TEST Tropitel User','clinic_user'),
  ('c0000000-0000-4000-8000-000000000002','TEST Romance User','clinic_user'),
  ('b0000000-0000-4000-8000-000000000001','TEST Al-Kawther Reception','reception_user'),
  ('b0000000-0000-4000-8000-000000000002','TEST Sheraton Reception','reception_user')
on conflict (user_id) do nothing;

-- 3) Location scopes (admin needs none) ------------------------------------
insert into public.portal_user_location_scopes (user_id, location_id)
select u.uid, l.id
from (values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'tropitel'),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'romance'),
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'al_kawther'),
  ('b0000000-0000-4000-8000-000000000002'::uuid, 'sheraton')
) as u(uid, code)
join public.portal_locations l on l.code = u.code
on conflict (user_id, location_id) do nothing;

-- 4) Test staff + assignments (1 nurse + 1 doctor per test location) --------
insert into public.portal_staff (staff_code, full_name, staff_role) values
  ('TEST-TR-NUR-001','TEST Nurse Tropitel','nurse'),
  ('TEST-TR-DOC-001','TEST Doctor Tropitel','doctor'),
  ('TEST-RO-NUR-001','TEST Nurse Romance','nurse'),
  ('TEST-RO-DOC-001','TEST Doctor Romance','doctor'),
  ('TEST-AK-NUR-001','TEST Nurse Kawther','nurse'),
  ('TEST-AK-DOC-001','TEST Doctor Kawther','doctor'),
  ('TEST-SR-NUR-001','TEST Nurse Sheraton','nurse'),
  ('TEST-SR-DOC-001','TEST Doctor Sheraton','doctor')
on conflict (staff_code) do nothing;

insert into public.portal_staff_location_assignments (staff_id, location_id, assignment_role)
select s.id, l.id,
       (case when s.staff_role = 'nurse' then 'nurse' else 'doctor' end)::portal_assignment_role
from public.portal_staff s
join public.portal_locations l on l.code = (
  case
    when s.staff_code like 'TEST-TR-%' then 'tropitel'
    when s.staff_code like 'TEST-RO-%' then 'romance'
    when s.staff_code like 'TEST-AK-%' then 'al_kawther'
    when s.staff_code like 'TEST-SR-%' then 'sheraton'
  end)
where s.staff_code like 'TEST-%'
on conflict (staff_id, location_id, assignment_role) where active do nothing;

-- 5) One sample patient + case at Tropitel (created_by Tropitel test user) ---
insert into public.portal_patients (id, first_name, last_name, date_of_birth, gender, nationality, created_by)
values ('d0000000-0000-4000-8000-000000000001','TEST','Patient One','1990-01-15','male','German',
        'c0000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.portal_cases (id, patient_id, registered_location_id, current_location_id, encounter_pattern, financial_type, route, visit_date, created_by)
select 'e0000000-0000-4000-8000-000000000001',
       'd0000000-0000-4000-8000-000000000001',
       l.id, l.id, 'outpatient_single', 'cash', 'direct', current_date,
       'c0000000-0000-4000-8000-000000000001'
from public.portal_locations l where l.code = 'tropitel'
on conflict (id) do nothing;

-- =====================================================================
-- ROLLBACK (remove test seed)
-- ---------------------------------------------------------------------
-- delete from public.portal_cases where id = 'e0000000-0000-4000-8000-000000000001';
-- delete from public.portal_patients where id = 'd0000000-0000-4000-8000-000000000001';
-- delete from public.portal_staff_location_assignments where staff_id in (select id from public.portal_staff where staff_code like 'TEST-%');
-- delete from public.portal_staff where staff_code like 'TEST-%';
-- delete from public.portal_user_location_scopes where user_id in
--   ('c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002');
-- delete from public.portal_user_profiles where user_id like '_0000000-0000-4000-8000-0000000000%';
-- delete from auth.users where email like '%@portal.test';
-- =====================================================================
