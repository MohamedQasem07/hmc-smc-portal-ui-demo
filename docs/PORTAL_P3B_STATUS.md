# Aegis Portal — P3B / Wave-1 / Wave-2 STATUS & session handoff
_Last updated 2026-05-30. Read this first to resume in a new session._

## How to run
- **Mock (safe fallback):** `npm run dev` → http://localhost:5173 (browser-local, no backend). Untouched/working.
- **Supabase (live, isolated):** `npm run dev:supabase` → http://localhost:5180 (sets `VITE_DATA_BACKEND=supabase`). Reads `.env.local` (URL + publishable key — gitignored; NO service-role).
- Launch config `aegis-verify` (root `.claude/launch.json`) runs the 5180 supabase server. The project `.claude/launch.json` also defines `hmc-portal-dev` (5173 mock) and `aegis-supabase` (5180 live, strict port) for the preview tooling.

## Backend
- **`hmc-medical`** (`zlgxalmaiwatnoydgkxo`) · schema `public.portal_*`. **`hmc-v2` (`gynsbdiofcizwbymzppq`) is PROTECTED — never touch.** No service-role key anywhere.
- Migrations applied to hmc-medical: `001–015` (P3A) + **`016`** (billing-prep cols) + **`017`→`018`** (`portal_assign_our_ref` collision-safe). All saved under `supabase/migrations/`.

## TEST users (login by EMAIL, password `portaltest` — throwaway)
`admin@portal.test` (admin) · `tropitel / romance / sahl_hasheesh / mamsha / pharaoh / menamark @portal.test` (clinic_user, own clinic) · `kawther / sheraton @portal.test` (reception_user, own branch). Real `mohamedqasem436@gmail.com` = admin (owner verifies it himself — do NOT touch its password). 9 portal users total + the real admin.

## What RENDERS live in the UI (supabase mode)
Login (Supabase Auth) · case lists (RLS-scoped) · **New Case intake** (patient + case + insurance Stage-1 intake/company/ref/email + patient-excess charge + server `our_ref`) · **Insurance Completion** (admin → `portal_insurance_billing_preparations`) · **Transfers** (table pages; source/destination/admin scoping). Cash/excess intake lines **record collections** via `portal_record_collection` RPC.
- **Task #9 (2026-05-30) — Collections + Attendance now render live (was the last mock surface):**
  - **Collections list** — `ClinicTreasuryP2C` (own clinic), `ReceptionCollectionsP2C` (own branch), `PremiumAdminCollections` (admin = all) render `fetchCollections()` (RLS-scoped). Shows clinic, case/OUR-ref, patient, purpose, method, original cur/amount, settlement cur/amount, FX rate, collected-by (name via `portal_user_profiles`, best-effort), collected-at. Cash kept in original currency; Visa/Card settles EGP with stored FX. No invented FX.
  - **Attendance** — `ClinicAttendanceP2C`: clinic user records + sees own day (`portal_record_nurse_shift` / `portal_end_nurse_shift` / `portal_record_doctor_duty`; reads `portal_nurse_shifts` / `portal_doctor_daily_duty`). Nurse/doctor pickers come from `portal_staff_location_assignments` (RLS-scoped → only staff the RPC will accept). Admin gets a read-only all-clinic daily overview.
  - New live helpers in `portalData.js`: `fetchCollections` (enriched), `fetchAttendance`, `fetchAssignableStaff`, `locationIdForCode`, `recordNurseShift`, `endNurseShift`, `recordDoctorDuty`. Shared components: `src/pages/preview/p2c/live/LiveCollectionsList.jsx`, `LiveAttendancePanel.jsx`. Each page early-returns the live component only when `IS_SUPABASE`; the mock body is preserved verbatim as `Mock*` (5173 untouched).

## Verified (server-side RLS, all PASS)
admin sees all · each clinic sees only its own cases/collections/attendance · source clinic sees sent transfers · destination branch sees incoming transfers · unrelated clinics see nothing · billing-prep admin-only · Old Cases admin-only & untouched.

## Architecture (where the code lives)
- `src/lib/api/config.js` — `IS_SUPABASE`, `VITE_DATA_BACKEND` flag.
- `src/lib/api/supabaseClient.js` — lazy client (dynamic import; created only in supabase mode).
- `src/lib/api/auth.js` — `sbSignIn/sbGetSessionUser/sbOnAuthChange`; maps `portal_role`+scope → frontend role (`clinic_user`→`clinic_nurse`, `reception_user`→`reception_kawther/sheraton`, location code = `assignedClinicId`).
- `src/lib/api/portalData.js` — `fetchCases` (RLS reads + reverse-map to mock case shape, incl. transfer/intake/prep), `insertCase` (patient+case+`our_ref` RPC+insurance intake+excess charge+collections+transfer), `recordCollection`, `fetchCollections`, `upsertBillingPrep`.
- `src/lib/api/portalMapping.js` — enum/field maps + `billingPrepToRow`.
- `src/context/UserModeContext.jsx` — supabase-aware session (`authReady`, async `signIn`).
- `src/context/DemoStateContext.jsx` — supabase mode backs `cases` from `fetchCases` (on auth change); `addCase`/`completeInsurance` async → portal_*.
- `src/premium/guards.jsx` — `RequireRole`/`RequireReceptionBranch` (+ `authReady` gate).
- `src/App.jsx` — guarded route groups; legacy `/clinic` `/admin` redirect to login.

## REMAINING WORK (next session — task list does NOT persist, so it's here)
1. ~~UI-bind Treasury/Collections + Attendance to `portal_*`~~ **DONE 2026-05-30 (Task #9)** — verified live in the UI for admin / tropitel / romance (isolation), with a live nurse-shift + doctor-duty test action. See the "Task #9" block above.
2. Still-mock in supabase mode: case-detail actions (close visit / admit / discharge / session), room assignment, handovers (cash/Visa), daily reports.
3. Create real clinic-staff users (replace TEST) when going live.
4. **Gated (owner approval):** Old Cases import after the 31-05 Master Sheet closing snapshot; contacts intelligence from `C:\Users\moham\OneDrive\Documents\mail data.CSV`.

## Gotchas (cost time this session)
- **SQL-seeded `auth.users` can't log in** until token columns are `''` (not NULL) AND `encrypted_password` is set AND `email_confirmed_at` is set. New TEST users are created with all three (no `auth.identities` row needed here). Pattern is in the user-creation SQL (this session).
- **RLS impersonation test pattern:** in one `execute_sql` — `begin; select set_config('app.uid',(select id::text from auth.users where email='…'),true); set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub',current_setting('app.uid'),'role','authenticated')::text, true); <query>; rollback;` (capture uid as postgres BEFORE switching role — `authenticated` can't read `auth.users`).
- `our_ref` is server-assigned via `portal_assign_our_ref` (collision-skips legacy refs). Client no longer owns it.

## TEST data currently in hmc-medical (do NOT clean yet — owner's instruction)
Cases: `TEST-RLS-*` (4), `TESTUI CreatedTropitel`, `TESTINS SahlInsurance`, `TESTXFER ToKawther` (+ migration-010 seed). 1 transfer (sahl→al_kawther), 2 collections (tropitel), **2 nurse shifts (tropitel: 1 closed + 1 active — the closed one is from the Task #9 UI end/start test)** + 1 doctor duty (tropitel), 2 billing-prep rows, insurer `TEST Insurer Co`. Per-clinic staff assignments seed: each of tropitel/romance/al_kawther/sheraton has 1 TEST nurse + 1 TEST doctor (mamsha/pharaoh/menamark/sahl_hasheesh have none yet → their attendance pickers are empty).

## Config-first admin + Staging pilot (2026-05-31)
Owner authorized a real **staging deploy** (GitHub Pages, Supabase-connected) — supersedes the earlier "no public deploy" line FOR STAGING ONLY (still not final go-live; no PHI/Master-Sheet/Old-Cases bulk import).

**Migrations:** `019_config_reference_tables` (new `portal_payment_methods` + `portal_nationalities`, admin RLS) + a 245-row nationalities seed read-only-sourced from hmc-v2 `public.nationalities`. New tables only — zero impact on existing data. `portal_rooms` already existed (30 rows).

**Live admin config (supabase mode; mock preserved via `IS_SUPABASE` early-return):**
- `PremiumAdminReferenceLists` → `LiveReferenceConfig`: Rooms (add/rename/activate per main branch → `portal_rooms`), Payment Methods (toggle → `portal_payment_methods`), Nationalities (search/toggle → `portal_nationalities`).
- `PremiumAdminUsersStaff` → `LiveUsersStaffConfig`: Users + grant/revoke clinic scope (`portal_user_location_scopes`); Staff add + assign nurse/doctor to clinic (`portal_staff` + `portal_staff_location_assignments`). Admin-only guard kept. **No passwords / auth-user creation in client** — needs a server-side Edge Function (owner-gated).
- New Case nationality picker → live `portal_nationalities` via `src/lib/useNationalityOptions.js`.
- New data fns in `portalData.js`: `fetchLocations, fetchRooms, upsertRoom, setRoomActive, fetchPaymentMethods, setPaymentMethodActive, fetchNationalities, setNationalityActive, fetchAdminUsers, grantUserScope, revokeUserScope, fetchAdminStaff, upsertStaff, assignStaffToClinic, unassignStaff`.

**Deploy readiness:** prod build passes (1699 modules) at base `/hmc-smc-portal-ui-demo/`, HashRouter (deep-links OK), **no service-role in bundle**, anon-only, supabase mode. Committed to branch **`staging-supabase`** (`d81521a3`); `main` untouched (`1dc77049`). `pages.yml` updated to build supabase mode from repo secrets.
**GO-LIVE (owner, ordered):** (1) add repo secrets `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (anon only, Settings→Secrets→Actions); (2) merge `staging-supabase`→`main` (or push + run the workflow) → publishes `https://mohamedqasem07.github.io/hmc-smc-portal-ui-demo/`. THEN verify from the deployed URL.
**Rollback:** revert `pages.yml` to `npm run build:pages` (mock) or disable the workflow; `git revert` the staging commit; Pages serves last good artifact; Supabase unchanged. To fully un-publish: Settings→Pages→source None.

## Constraints (standing)
TEST-only · no PHI · no Master Sheet import · no Old Cases import · **staging Pages deploy AUTHORIZED (pilot, not final go-live)** · no service-role key · hmc-v2 untouched (read-only nationality inspect was OK) · 5173 mock fallback intact · 5180 supabase isolated.
