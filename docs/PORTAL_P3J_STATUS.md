# Aegis Portal — P3J STATUS & new-session handoff
_Last updated 2026-06-01. **Read this first** to resume. Supersedes PORTAL_P3B_STATUS.md as the current handoff._

## TL;DR — current live state
- **Live:** https://mohamedqasem07.github.io/hmc-smc-portal-ui-demo/ — HTTP 200, bundle **`index-B-2UDxjm.js`**.
- **`origin/main` == HEAD == `bb8875e`** (working branch `staging-supabase`; deploy = `git push origin staging-supabase:main` → GitHub Pages Action).
- **Backend:** `hmc-medical` (`zlgxalmaiwatnoydgkxo`), schema `public.portal_*`. **`hmc-v2` (`gynsbdiofcizwbymzppq`) PROTECTED — never touch.** No service-role key anywhere (anon/publishable only).
- **Latest migration applied:** `031_portal_admin_delete_case_rpc` (the only new DB object this sprint).
- Run: `npm run dev` (5173 mock) · `npm run dev:supabase` (5180 live, reads `.env.local`). Build: `npm run build` + `npm run build:pages`.

## How to deploy + verify (the established loop)
1. `npm run build` + `npm run build:pages` (must pass).
2. Commit on `staging-supabase`; `git push origin staging-supabase:main` (deploy) + `git push origin staging-supabase`.
3. Poll the live URL until `assets/index-*.js` changes; then verify HTTP 200, **no `service_role`** in the bundle (`curl … | grep -c service_role` == 0), and your feature strings present.

## P3J commit chain (this session, all deployed)
| Commit | What |
|---|---|
| `82e1fca` | P3I (sprint baseline — pre-P3J) |
| `405db22` | **Cash-save persistence fix** — dead refresh-token → silent empty reads; honest read + escalate-to-relogin; **NEW "Record collection" action** on Case Detail |
| `32c9493` | **Payment-line calc fix** — same-currency cash now computes live (Collected/Outstanding/Paid); Edit Full Registration drops the non-persisting payment lines (→ Record collection); honest save errors |
| `83fe9ee` | **Task 1 Admin global ops** — admin New Case location selector; transfer-receive button; admin attendance/coverage for any clinic |
| `a14aaff` | **Task 2 Safe admin delete** — `portal_admin_delete_case` RPC (migration 031) + Case Detail danger-zone typed-DELETE modal |
| `bb8875e` | **Admin receive transfer in-place** — one-click receive from the Operational Alert (All P2C Cases) + Case Detail (was a deep-link to the reception screen) |

## What shipped — feature detail
- **Cash save was never broken on write** — the 600 EGP for جنى عاطف (SHMC-162026.005) always persisted in `portal_case_charges` (`charge_type='cash_case_amount'`). The bug was a **dead refresh token** → RLS reads return empty → `loadFin()` swallowed it → looked wiped. Fix: `auth.js` adds `isAuthSessionError / escalateIfAuthError / sbEnsureSession` + a `sessionExpired` flag (UserModeContext) → clean re-login; reads/writes never fake success.
- **Collections** are recorded via Case Detail → **"Record collection"** (cash or Visa/FX) → `portal_record_collection` RPC (writes the collection + treasury movement). Needs an active `portal_treasury_account` for (location, currency, channel) or it raises `PORTAL_CONFIG`.
- **Admin global operation** (frontend-only; admin already passes `portal_has_location`):
  - New Case: `/admin/new-case` → live form; admin-only "Register case for clinic/branch" selector (CODE-valued) → `registeredAtId`; "Admin operating for: [X]" badge. Non-admins locked to their own clinic.
  - Attendance: `/admin/attendance` has an admin clinic picker; reuses the clinic-mode record controls scoped to the picked location. **Staff must exist + be actively assigned** to that location (no free-text path); seed via Users & Staff first. "Recorded by Admin for [clinic]" = `recorded_by`.
  - Transfer receive: one-click from the Operational Alert + Case Detail; `portal_receive_transfer` (admin-aware); origin (`registered_location`) preserved → counted transferred-in, not direct.
- **Safe admin delete** — `portal_admin_delete_case(p_case_id uuid, p_delete_orphan_patient boolean default true)` (SECURITY DEFINER, strict `portal_is_admin()`). Deletes case + all children FK-safe (visa-tx → treasury → collections → charges → cascades), NULLs `portal_legacy_case_staging` back-refs, deletes patient **only if orphan**, writes `portal_audit('case',id,'deleted',…)`. UI: admin-only Danger Zone → typed-`DELETE` modal.

## Files changed in P3J
`src/lib/api/auth.js`, `src/lib/api/portalData.js` (recordCaseCollection, adminDeleteCase, insertCase escalation), `src/context/UserModeContext.jsx`, `src/context/DemoStateContext.jsx`, `src/pages/preview/PremiumLogin.jsx`, `src/pages/preview/p2c/clinic/ClinicNewCaseP2C.jsx`, `src/pages/preview/p2c/live/LiveCaseWorkspace.jsx`, `src/pages/preview/p2c/live/LiveAttendancePanel.jsx`, `src/pages/preview/PremiumAdminP2CCases.jsx`, `src/premium/PaymentLines.jsx`, `src/App.jsx`, `src/premium/AdminShell.jsx`, `supabase/migrations/031_portal_admin_delete_case_rpc.sql` (new).

## Key DB / RPC facts (reuse these)
- `portal_is_admin()` = caller's profile is active+role=admin. `portal_has_location(loc)` = `portal_is_admin() OR active scope on loc` → **admin passes every location gate** (case insert, attendance, receive). The owner admin holds **0** explicit location scopes — admin-ness alone suffices.
- Admin-aware RPCs already present: `portal_record_collection`, `portal_record_nurse_shift` / `portal_end_nurse_shift` / `portal_record_doctor_duty`, `portal_receive_transfer`, `portal_discharge_case`, `portal_admin_delete_case`.
- Cash invoice = `portal_case_charges`. FK graph for delete: 10 CASCADE children + NO ACTION blockers (`portal_treasury_movements.case_id`/`.collection_id`, `portal_visa_handover_transactions.collection_id`, `portal_collections.charge_id`, `portal_legacy_case_staging.imported/matched_case_id`); `portal_patients` has only `portal_cases.patient_id` inbound.

## Rollback
- Whole P3J: `git push --force origin 82e1fca:main` (the delete RPC stays — additive/admin-only; to also remove: `drop function public.portal_admin_delete_case(uuid, boolean);`).
- Any single commit can be reverted individually (e.g. `git push --force origin a14aaff:main` to undo only the in-place receive).

## UAT temp-admin pattern (for UI testing; DELETE after)
Throwaway login `admin@portal.test` / `PortalUAT2026!`. The seed needs all of: `email_confirmed_at`, all `*token*`+`email_change`+`phone_change` columns = `''`, an `auth.identities` row, and a `portal_user_profiles` row (role=admin). (SQL pattern is in this session's transcript.) Verify the UI by **refresh-persistence**, not just on-screen state. Always delete the temp admin + all UAT rows (cases/patients/collections/treasury/charges/transfers/staff/shifts/audit) after and confirm 0 residual.

## Real data at session end (do not clean — real)
4 cases: Ali Hassan (SHMC-162026.014), OLENA HABUDA (HMC202630002), جني عاطف (SHMC-162026.005), **Nalilia Fedorova (SHMC-162026.013 — transfer Menamark→Sheraton still `sent`/awaiting; owner to receive)**. 2 collections: Ali Hassan 400 EGP (Ahmed Khedr), جني عاطف 600 EGP (Mohamed). 15 staff, 11 active user profiles. No UAT residue, no temp admins.

## Pending / gated (do NOT start without explicit owner go)
- **Service Catalog / checklist import** from Claude billing sources.
- **Insurance Companies import from Master Sheet** (billing-source sensitive; respects the "never modify Master Sheet" rule — read-only import only, owner-gated).
- mamsha/menamark still lack complete real staff (attendance for them needs staff seeded+assigned via Users & Staff).

## Gotchas
- Dead Supabase refresh token → RLS reads return **empty silently** (no error). Never swallow; escalate auth errors → re-login. (Memory: `portal-dead-refresh-token-silent-reads`.)
- Vite dev HMR can wedge after many rapid edits even when `npm run build` passes — restart the dev server (preview_stop + preview_start) to clear it.
- CI (Linux) bundle hash differs from a local Windows build — verify "bundle CHANGED", not an exact hash match.
