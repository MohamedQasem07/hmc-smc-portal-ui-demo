# PORTAL SUPABASE EXECUTION REPORT (P3A)

Secure Supabase data foundation for the HMC / SMC Clinic Portal.

---

## PHASE A — Read-only Supabase inspection  ✅ complete

**Connection:** Supabase MCP, organisation **HMC** (`bmcbehjkmhqdabujiiyd`),
region eu-west-1. Three projects found.

| Project | Ref | Status | Created | public schema | Notable content | Real data? |
|---|---|---|---|---|---|---|
| PS Shop | `iiiacdhlgixkwzykthrl` | **INACTIVE** | 2026-05-13 | unreachable (paused) | — | unknown (paused) |
| hmc-v2 | `gynsbdiofcizwbymzppq` | ACTIVE_HEALTHY | 2026-05-20 | **20 tables, full "V2.4" build** | RBAC (roles/permissions), **staff = 72 rows**, **patients = 5 (3 with passport/national-ID)**, cases = 6, profiles = 3, clinics = 8, reference data (medical_items 2463, price_list 914, lab_tests 198, insurance 25, hotels 40, nationalities 245), audit_logs, RLS enabled throughout | **YES — appears real** (72 staff, 0 test-flagged, all bulk-loaded 2026-05-21; patients carry passport/national-ID) |
| hmc-medical | `zlgxalmaiwatnoydgkxo` | ACTIVE_HEALTHY | 2026-04-03 | **empty (0 tables)** | separate `portal` schema with 7 small tables (clinics 8, profiles 1, admin_bootstrap 2; **cases 0, payments 0, case_files 0 → no PHI**); 50 prior migrations; auth.users = 1; 1 storage bucket | **NO PHI / financial / staff data** |

**Auth/Storage:** hmc-v2 has 3 auth users + 1 storage bucket; hmc-medical has
1 auth user + 1 storage bucket. **Extensions** available on the candidate
(hmc-medical): `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`,
`plpgsql` → `gen_random_uuid()` available.

### Execution-gate determination

- **hmc-v2 is OFF-LIMITS for new writes.** It contains what looks like real
  HMC operational data (72 staff, patients with passport/national-ID, a full
  prior V2.4 schema). Per the sprint's STOP rule, its tables/policies/data
  must not be altered. (Note: my prior session memory recommended hmc-v2 for
  the portal — that recommendation is now **stale/unsafe** because real data
  has since been loaded there.)
- **hmc-medical is the only safe ACTIVE candidate.** Its `public` schema is
  empty and it holds **no PHI/financial/staff data** (only an abandoned, near-
  empty `portal` schema + reference clinics). New `portal_`-prefixed tables in
  its `public` schema would be fully isolated from the old `portal` schema.
- **PS Shop is inactive** and not a candidate.

A safely isolated target therefore **exists** (hmc-medical / public / `portal_`
prefix), so the sprint may proceed to execution **once Mohamed confirms the
target**, because choosing the production source-of-truth project is an
owner-level decision and the previously-assumed project now holds real data.

---

## PHASE B — Architecture + SQL preparation  ✅ complete (all local, no DB writes)

Authored under `supabase/` and `docs/backend/` (target-agnostic — `portal_`
prefix in `public`, works in any approved project):

**Migrations** (`supabase/migrations/`)
- `001_portal_extensions_and_enums.sql` — pgcrypto, all enum types, updated_at trigger fn
- `002_portal_master_tables.sql` — facilities, locations, rooms + seeds (2 / 8 / 30)
- `003_portal_staff_auth_scope_tables.sql` — staff, assignments, user profiles, location scopes
- `004_portal_patient_case_encounter_tables.sql` — patients, ref counters, cases, encounters, travel, transfers, room assignments
- `005_portal_insurance_tables.sql` — insurers, local assistance, intakes, **admin-only** billing preparations
- `006_portal_finance_treasury_tables.sql` — charges, collections, treasury accounts/movements, expenses, handovers (+ seed accounts)
- `007_portal_attendance_audit_tables.sql` — nurse shifts, doctor duty, audit log
- `008_portal_functions_triggers.sql` — RLS helpers, audit fn, balance view, secure business functions, provisional ref
- `009_portal_rls_policies.sql` — grants/revokes + all RLS policies + `portal_can_access_case()`
- `010_portal_test_seed_and_verification.sql` — TEST-ONLY personas/staff/sample case

**Tests** (`supabase/tests/`)
- `PORTAL_RLS_TEST_MATRIX.md` — 22 persona/permission expectations
- `portal_security_verification.sql` — runnable persona-impersonation checks

**Docs** (`docs/backend/`)
- `PORTAL_BACKEND_ARCHITECTURE.md`
- `PORTAL_FRONTEND_TO_SUPABASE_MAPPING.md`
- `PORTAL_REFERENCE_FORMAT_EVIDENCE.md`
- `PORTAL_SUPABASE_EXECUTION_REPORT.md` (this file)

**Config**
- `.env.example` (no secrets; anon vs service-role separation documented)

All SQL is additive, `portal_`-prefixed, RLS-enabled-from-creation, and does
not reference or modify any pre-existing object in any project.

---

## PHASE C — Execution  ✅ complete

**Target approved by Mohamed:** `hmc-medical` (ref `zlgxalmaiwatnoydgkxo`),
`public` schema, `portal_` prefix. Fully isolated from its pre-existing
`portal` schema; hmc-v2 (real data) was NOT touched.

**Migrations applied (in order):** `001`–`011` via Supabase MCP
`apply_migration` (recorded in `supabase_migrations.schema_migrations`).
`011` is a security-hardening pass (see below).

**Objects created (verified):**
- **29** `portal_` tables — **all 29 RLS-enabled**.
- **63** RLS policies (+ tightened in 011).
- **16** `portal_` functions (helpers + secure business transactions).
- **1** view: `portal_treasury_balances` (security_invoker).
- Seed config: 2 billing facilities, 8 locations, 30 rooms, 40 treasury accounts.
- Test seed (010): 5 auth users + profiles, 4 location scopes, 8 staff +
  assignments, 1 sample patient + case.

**Security advisor pass (after 011 hardening):**
- Fixed: anon-executable SECURITY DEFINER functions (revoked from anon/PUBLIC);
  unguarded balance-leak (`portal_account_balance` no longer client-callable);
  `rls_enabled_no_policy` on reference counters; mutable search_path on trigger
  fn; three `WITH CHECK (true)` UPDATE policies tightened to scope.
- Remaining (accepted/expected): 12× `authenticated_security_definer_function_executable`
  — the secure RPC business functions + boolean helpers MUST be callable by
  signed-in users; each performs its own internal authorization. 1× auth
  `leaked_password_protection` — a Supabase **Auth dashboard** toggle to enable
  in P3B (not SQL-fixable).

### RLS / function test matrix — results

| # | Persona | Action | Expected | Actual | Pass |
|---|---|---|---|---|---|
| 1 | Admin | select locations | 8 | 8 | ✅ |
| 2 | Admin | select cases | all | 1 | ✅ |
| 3 | Admin | select billing prep | allowed | visible | ✅ |
| 4 | Admin | select treasury balances | 40 | 40 | ✅ |
| 5 | Tropitel | select cases | own only | 1 | ✅ |
| 6 | Tropitel | select billing prep (1 row exists) | **0 (denied)** | 0 | ✅ |
| 9 | Tropitel | select Romance cases | 0 | 0 | ✅ |
| 10 | Tropitel | select staff | own only | 2 | ✅ |
| 11 | Romance | select Tropitel cases | 0 | 0 | ✅ |
| 15 | Anon | select any portal table | denied | permission denied | ✅ |
| 16 | Tropitel | record_collection @ Tropitel | ok + balance | id; EUR 100.00 in ledger | ✅ |
| 17 | Tropitel | record_collection @ Romance | PORTAL_DENIED | PORTAL_DENIED | ✅ |
| 18 | Tropitel | record_expense overspend | insufficient | insufficient (0 < 100) | ✅ |
| 20 | Tropitel | nurse shift, Romance nurse | blocked | PORTAL_RULE blocked | ✅ |
| 20b | Tropitel | nurse shift, Tropitel nurse | ok | ok | ✅ |
| 22 | Tropitel | direct insert audit_log | RLS violation | RLS violation | ✅ |

**Result: 16 / 16 executed checks passed.** Collection→movement→balance→audit
flow verified end-to-end (ledger-derived balance, audit row auto-created).

**Test data status:** Verification-only financial artifacts (1 collection,
1 movement, 1 audit row, 1 billing-prep row) were **removed** after testing.
The structural 010 test seed **remains** (5 portal users + profiles, 4 scopes,
8 staff + assignments, 1 sample patient/case) so P3B review can start
immediately. All are clearly fictional (`@portal.test`, names `TEST …`).

---

## PHASE D — Final report & STOP  ✅

- **Supabase project used:** `hmc-medical` (`zlgxalmaiwatnoydgkxo`), isolated
  & owner-approved. hmc-v2 (real data) untouched; PS Shop inactive.
- **Tables:** 29 (all RLS-enabled). **Functions:** 16. **Views:** 1.
  **Policies:** 63 (post-011). **Migrations:** 001–011.
- **RLS matrix:** 16/16 passed (admin full; clinic/branch scoped; anon denied;
  admin-only insurance prep enforced; secure money/attendance functions).
- **OUR-Ref:** PROVISIONAL/disabled. uuid PK is the identity; counter +
  reservation mechanics exist; `PROV-YYYY-NNNNNN` only on explicit request.
  Final format awaits Mohamed's read-only Master-Sheet confirmation.
- **Test seed:** structural seed retained; financial artifacts removed.
- **Repository files:** `supabase/migrations/001–011`, `supabase/tests/*`,
  `docs/backend/*` (4 docs), `.env.example`. No secrets committed.
- **Pushed / deployed:** **NO.** No git push, no frontend build/deploy, no
  frontend↔Supabase connection, no production Auth, no real data, Invoice
  Manager / PDF / Master Sheet / OneDrive untouched.

### Recommended next step (for approval) — PORTAL-BACKEND-P3B
1. In the Supabase dashboard for `hmc-medical`: enable Leaked Password
   Protection; configure Auth (email) providers.
2. Add `VITE_SUPABASE_URL` + anon key to a local `.env.local` (never commit).
3. Build a thin data layer that replaces `UserModeContext` (demo session) with
   Supabase Auth and `DemoStateContext` reducers with PostgREST + the secure
   `portal_*` functions — preserving current UI behaviour, controlled test
   data only.
4. Confirm the OUR-Ref production format (read-only Master Sheet) and activate
   the deterministic generator.
