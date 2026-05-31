# PORTAL RLS TEST MATRIX (P3A)

Personas (test UUIDs from `010_portal_test_seed_and_verification.sql`):

| Persona | Role | UUID | Scope |
|---|---|---|---|
| Admin | `admin` | `a0000000-…-000000000001` | all locations |
| Tropitel User | `clinic_user` | `c0000000-…-000000000001` | tropitel |
| Romance User | `clinic_user` | `c0000000-…-000000000002` | romance |
| Al-Kawther Reception | `reception_user` | `b0000000-…-000000000001` | al_kawther |
| Sheraton Reception | `reception_user` | `b0000000-…-000000000002` | sheraton |
| Anonymous | `anon` | — | none |

How impersonation works in the verification SQL:
```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);
-- ... run SELECT/INSERT and observe ...
rollback;
```
`auth.uid()` resolves to the `sub` claim; SECURITY DEFINER helpers then read `portal_user_profiles` / `portal_user_location_scopes`.

## Expected outcomes

| # | Persona | Action | Expected |
|---|---|---|---|
| 1 | Admin | select portal_locations | all 8 |
| 2 | Admin | select portal_cases | all cases |
| 3 | Admin | select portal_insurance_billing_preparations | allowed (0+ rows) |
| 4 | Admin | select portal_treasury_balances | all locations |
| 5 | Tropitel | select portal_cases | only Tropitel-scoped cases |
| 6 | Tropitel | select portal_insurance_billing_preparations | **0 rows / denied** |
| 7 | Tropitel | insert case at Tropitel | allowed |
| 8 | Tropitel | insert case at Romance | **blocked (RLS with check)** |
| 9 | Tropitel | select Romance cases | **0 rows** |
| 10 | Tropitel | attendance staff (assigned active) | only Tropitel nurses/doctors |
| 11 | Romance | select Tropitel cases | **0 rows** |
| 12 | Al-Kawther | select incoming transfers to al_kawther | visible |
| 13 | Al-Kawther | select Sheraton private cases | **0 rows** |
| 14 | Sheraton | select Al-Kawther private cases | **0 rows** |
| 15 | Anonymous | select any portal_ table | **0 rows / denied** |
| 16 | Tropitel | portal_record_collection at Tropitel | allowed; movement created |
| 17 | Tropitel | portal_record_collection at Romance | **PORTAL_DENIED** |
| 18 | Tropitel | portal_record_expense > balance | **PORTAL_RULE insufficient** |
| 19 | Tropitel | portal_record_expense (Visa channel) | impossible (function forces physical_cash) |
| 20 | Tropitel | record nurse shift for unassigned staff | **PORTAL_RULE** |
| 21 | Tropitel | direct insert into portal_treasury_movements | **blocked (admin-only)** |
| 22 | Tropitel | direct insert into portal_audit_log | **blocked (admin-only)** |

Pass/fail results are recorded in `docs/backend/PORTAL_SUPABASE_EXECUTION_REPORT.md` after Phase C.
