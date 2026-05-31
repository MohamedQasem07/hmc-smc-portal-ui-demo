# PORTAL P3C.2 — Canonical Auth/Profile Bridge + Synthetic Foundation (PROPOSAL)

**Type:** implementation proposal only. **No migrations executed, no frontend
code changed, no PHI, no deploy.** Stops for Mohamed's written approval.

**Decision context:** Option A is owner-approved (see
`PORTAL_P3B_DECISION_LOG.md`). P3C.1 is accepted directionally. This document is
the **narrow first executable sprint** that everything else is gated behind. It
deliberately excludes the broad cutover and the Excel Import workspace.

**Grounding:** every object name, column, enum, function, grant and RLS predicate
below was read live (read-only catalog/aggregate SQL, no PHI columns selected)
from the approved project **`hmc-medical` (`zlgxalmaiwatnoydgkxo`)** on
2026-05-29. `hmc-v2` and `PS Shop` were not queried.

---

## 0. Scope of the first executable sprint (in / out)

**In scope (this sprint only):**
1. Make `hmc-portal` recognize an authenticated **admin** through the canonical
   `public.portal_*` backend.
2. Establish the canonical **profile / role / location** mapping RLS needs.
3. **Synthetic/test-only** data to verify login, admin access, clinic
   restriction, and future legacy-module visibility.
4. One **read-only** Admin/Dashboard cutover slice (admin can read the canonical
   legacy tables; non-admin cannot) — before any create/update workflow.

**Explicitly OUT of this sprint:** Excel upload/import; case/payment/treasury/
attendance writes; insurance status edits; broad refactor of the 20 mapped
operations; onboarding real clinic/reception staff; deleting the test seed;
altering or dropping the non-canonical `portal` schema; any public deploy.

---

## A. Exact canonical object names (authoritative — use verbatim)

Resolves the earlier `portal_*` / `portal_user_profiles` shorthand ambiguity.
All objects are in schema **`public`** unless stated.

### A.1 Identity / role / location (the RLS spine)

| Purpose | Exact object | Key columns (live) |
|---|---|---|
| Portal user identity | **`public.portal_user_profiles`** | `user_id uuid PK → auth.users.id`, `display_name text`, `role public.portal_role`, `active bool=true`, `linked_staff_id uuid → public.portal_staff`, `created_at`, `updated_at` |
| Role values | enum **`public.portal_role`** | `admin, clinic_user, reception_user, owner, insurance_staff, treasury, nurse, doctor, viewer_auditor` |
| User → location scope (RLS) | **`public.portal_user_location_scopes`** | `user_id uuid`, `location_id uuid → portal_locations`, `active bool=true` |
| Locations (clinics/branches) | **`public.portal_locations`** | `code`, `name`, `location_type public.portal_location_type {external_clinic, main_branch}`, `active`, `has_room_board`, `allows_expenses` |
| Billing facilities | **`public.portal_billing_facilities`** | `code`, `name`, `active` |
| Operational staff master (NOT auth identity) | **`public.portal_staff`** | `staff_code`, `full_name`, `staff_role public.portal_staff_role`, `active` |
| Staff → location roster (NOT auth/RLS) | **`public.portal_staff_location_assignments`** | `staff_id`, `location_id`, `assignment_role public.portal_assignment_role`, `active` |

> **Identity vs. staff distinction (important):** an *authenticated app user* is a
> row in **`portal_user_profiles`** keyed by `auth.users.id`. **`portal_staff`** is
> the operational personnel roster (nurses/doctors for attendance), optionally
> linked via `portal_user_profiles.linked_staff_id`. RLS keys off
> `portal_user_profiles` + `portal_user_location_scopes`, never `portal_staff`.

### A.2 Cases / patients (touched read-only this sprint)

| Purpose | Exact object | Notes |
|---|---|---|
| Cases | **`public.portal_cases`** | normalized; `patient_id`, `registered_location_id`, `current_location_id`, `admin_only_legacy_case bool=false`, `source_type text='portal_registration'`, `legacy_import_batch_id`, `created_by` |
| Patients (PHI) | **`public.portal_patients`** | `first_name,last_name,full_name,date_of_birth,…` — **PHI; never SELECTed by the assistant** |

### A.3 Legacy import + status history (read-only proof target this sprint)

| Purpose | Exact object |
|---|---|
| Import batch headers | **`public.portal_legacy_import_batches`** (has `source_file_hash`; **no** `source_content_hash` column yet) |
| Per-row staging | **`public.portal_legacy_case_staging`** (`masked_patient_identifier`, `mapped_payload jsonb`, `validation_status`, `matched_existing_case_id`, `imported_case_id`) |
| Import exceptions | **`public.portal_legacy_import_exceptions`** |
| Insurance status timeline | **`public.portal_insurance_case_status_history`** (`status public.portal_insurance_status` — 13 states pending→paid/closed/needs_review) |

### A.4 Functions (15 total; names verbatim)

- **RLS helper functions (5)** — SECURITY DEFINER, `search_path=public,pg_temp`
  locked, `authenticated` EXECUTE = **true** (required, see §C):
  `portal_is_admin()`, `portal_is_active_user()`, `portal_current_role()`,
  `portal_has_location(p_location_id uuid)`,
  `portal_can_access_case(p_case_id uuid)`.
- **Business write RPCs (7)** — SECURITY DEFINER, search_path locked,
  `authenticated` EXECUTE = true (not used by this sprint, see §C):
  `portal_create_case_with_ref(...)`, `portal_record_collection(...)`,
  `portal_record_expense(...)`, `portal_record_nurse_shift(...)`,
  `portal_end_nurse_shift(p_shift_id uuid)`, `portal_record_doctor_duty(...)`,
  `portal_confirm_visa_handover(...)`.
- **Already locked down (not authenticated-executable):** `portal_audit(...)`,
  `portal_reserve_case_ref(...)`, `portal_account_balance(...)` (SECURITY
  DEFINER, EXECUTE revoked from authenticated in migration 011);
  `portal_set_updated_at()` (SECURITY INVOKER trigger fn).

### A.5 Live RLS predicates relevant to this sprint (verbatim)

| Table | Policy | Cmd | Predicate |
|---|---|---|---|
| `portal_user_profiles` | `portal_user_profiles_sel` | SELECT | `(user_id = auth.uid()) OR portal_is_admin()` |
| `portal_user_profiles` | `portal_user_profiles_admin` | ALL | `portal_is_admin()` |
| `portal_cases` | `portal_cases_sel` | SELECT | `portal_is_admin() OR (admin_only_legacy_case = false AND (has_location(registered)…))` |
| `portal_legacy_import_batches` | `portal_legacy_batches_admin` | ALL | `portal_is_admin()` |
| `portal_legacy_case_staging` | `portal_legacy_staging_admin` | ALL | `portal_is_admin()` |
| `portal_legacy_import_exceptions` | `portal_legacy_exc_admin` | ALL | `portal_is_admin()` |
| `portal_insurance_case_status_history` | `portal_status_hist_sel` | SELECT | `portal_is_admin() OR (portal_can_access_case(case_id) AND NOT case.admin_only_legacy_case)` |

**Consequence:** a user with **no** `portal_user_profiles` row, or a non-admin,
reads **zero** legacy rows — admin-only legacy visibility is already enforced in
the database. The first slice only has to *exercise* this, not build it.

---

## B. Auth / profile bridge proposal

### B.1 The verified gap

The **only** trigger on `auth.users` is **`tg_on_auth_user_created`, owned by the
non-canonical `portal` schema**, which inserts into `portal.profiles`. The
canonical `public` model has **no** signup auto-provision, and the real admin
(Mohamed) has **no** `public.portal_user_profiles` row yet. Every existing
`public.portal_user_profiles` row (5) is synthetic (`@portal.test`).

### B.2 Recommended mechanism — admin-controlled provisioning (NOT a public auto-trigger)

**Recommendation: do not add a public auto-provision trigger.** Provision
canonically through an **admin-initiated, server-only action**.

Rationale:
- Auto-provisioning every signup into a recognized profile is exactly the
  "unauthorized authenticated user" risk to block. RLS already denies all
  `portal_*` access when no `portal_user_profiles` row exists, so **"no profile =
  locked out" is the safe default and needs no new code.**
- The `portal`-schema trigger already auto-creates rows on signup; adding a
  second public auto-trigger while that schema is frozen compounds confusion.
- Admin provisioning matches the sprint goal: one verified admin + synthetic
  restricted users only, no open self-service onboarding.

The provisioning action (server-only; built in a later gate, not this read-only
slice) does, in one transaction: locate/confirm the `auth.users` row → insert
`public.portal_user_profiles (user_id, display_name, role, active)` → insert
`public.portal_user_location_scopes` rows for non-admin roles. This is the
canonical analogue of the existing `app/admin/users/new/actions.ts` (which today
writes the `portal` schema and leans on the `portal` trigger).

### B.3 Mapping the existing real admin → canonical admin

Bridge migration (gate 2) inserts one `public.portal_user_profiles` row for
Mohamed's real `auth.users` id with `role='admin', active=true`. Admins need
**no** location scope (they bypass scoping via `portal_is_admin()`).

**PHI-safe uid resolution (no literal PII, no uid through the assistant):** the
migration resolves the id inside the database from the existing bootstrap —
`INSERT … SELECT user_id FROM portal.profiles WHERE role='admin' AND is_active`
(read-only cross-schema SELECT; does not alter/drop `portal`). **Checkpoint:**
Mohamed confirms the resolved id is his own before the row is marked `active`.
Fallback: Mohamed supplies the uid at apply time.

### B.4 The 1 admin / 5 inactive nurse profiles in the non-canonical `portal` schema

**Defer.** They carry no operational case data. The single real admin is
re-established in `public` per B.3; the 5 inactive nurse profiles are **not**
migrated in this sprint (nurses are operational staff, onboarded later when their
write workflows exist). Final disposition of the `portal` schema stays parked
under the P3C.0 deprecation plan — untouched here.

### B.5 Location assignment — admin vs future clinic users

- **Admin:** no `portal_user_location_scopes` row (full access via
  `portal_is_admin()`).
- **Clinic/reception users (synthetic only this sprint):** one
  `portal_user_location_scopes` row per assigned `portal_locations.id`; RLS then
  limits them to their location(s) via `portal_has_location(...)`.

### B.6 Blocking unauthorized authenticated users (defense in depth)

1. **Database:** no `portal_user_profiles` row → `portal_is_active_user()` and
   `portal_is_admin()` return false → all `portal_*` RLS denies reads/writes.
2. **Application:** the new `requireCanonicalAdmin()` guard (see §E) denies when
   the self-profile SELECT returns no row or `role <> 'admin'`/`active=false`,
   redirecting before any data render.

### B.7 Service-role key confinement (confirmed, and unchanged by this slice)

`SUPABASE_SERVICE_ROLE_KEY` has **no** `NEXT_PUBLIC_` prefix; the admin client
(`lib/supabase/admin.ts`) is server-only. **The read-only slice uses no
service-role key at all** — it reads through the user's own JWT via the anon/
publishable key. Gate 3 verification: grep the client bundle config to confirm no
service-role/`SERVICE_ROLE` reference reaches browser code.

---

## C. SECURITY DEFINER hardening proposal

Live state: **12 WARN** (the 5 helpers + 7 business RPCs, all
`authenticated`-executable) + **1 WARN** leaked-password (Auth, separate). All 14
SECURITY DEFINER functions **already have `search_path=public,pg_temp` locked**
(migration 011) — so the remaining issue is *REST exposure*, not search_path.
Advisor: <https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable>

### C.1 Functions REQUIRED by the first slice — the 5 RLS helpers

The slice's reads (self-profile, legacy cases, legacy tables) are gated by RLS
policies that **call these helpers in the caller's context** (see §A.5). Postgres
checks EXECUTE on the helper for the calling role, so **revoking `authenticated`
EXECUTE would break every policy that calls them** (i.e. break the whole app).

| Function | Why required | EXECUTE now | EXECUTE target | Internal validation | Test (admin / clinic_user / anon) |
|---|---|---|---|---|---|
| `portal_is_admin()` | used by `portal_cases_sel`, all 3 legacy `_admin` policies, `portal_user_profiles_admin` | authenticated | **keep** authenticated | reads caller's own `portal_user_profiles.role='admin' AND active` | admin→true; clinic_user→false; anon→false (no JWT) |
| `portal_is_active_user()` | active-user gate across `portal_*` policies | authenticated | **keep** | caller's own `active=true` | admin/clinic→true; deactivated→false; anon→false |
| `portal_current_role()` | role-aware policies | authenticated | **keep** | returns caller's own role | returns correct role / null |
| `portal_has_location(uuid)` | `portal_cases_sel` location scoping | authenticated | **keep** | EXISTS in caller's `portal_user_location_scopes(active)` | scoped loc→true; other loc→false; anon→false |
| `portal_can_access_case(uuid)` | status-history visibility | authenticated | **keep** | admin OR case in caller's location & not admin-only-legacy | admin→true; clinic on own case→true; clinic on legacy→false |

**WARN disposition for the 5 helpers:** the WARN **cannot be cleared by revoke**
(would break RLS). Two honest options:
- **(C.1a) Accept + document as intentional** for this sprint: each helper
  returns only facts about the *caller's own* role/scope (no cross-tenant leak;
  `has_location`/`can_access_case` answer only about the caller's own access).
  Lowest risk to the slice; the WARN persists, documented.
- **(C.1b) Later hardening (separate migration, deferred):** relocate the 5
  helpers to an **unexposed** schema (e.g. `portal_private`), keep `authenticated`
  EXECUTE (RLS still needs it) but remove them from the PostgREST-exposed `public`
  API → the `/rest/v1/rpc/...` endpoints disappear and the WARN clears, with no
  RLS breakage. This touches every policy's function reference, so it is **out of
  the narrow sprint** and proposed as a follow-up.

**Recommendation:** C.1a now (document + accept), schedule C.1b as a tracked
follow-up hardening migration. The slice introduces **no new** exposure.

### C.2 Functions NOT required by the slice — the 7 business write RPCs (defer, untouched)

`portal_create_case_with_ref`, `portal_record_collection`, `portal_record_expense`,
`portal_record_nurse_shift`, `portal_end_nurse_shift`, `portal_record_doctor_duty`,
`portal_confirm_visa_handover`. The read-only slice calls **none** of them.

- **Immediate exposure?** No escalation: they are SECURITY DEFINER with locked
  search_path and are *intended* to be authenticated-callable (the future
  treasury/clinic/case features call them); their internal authz
  (`portal_is_admin`/`portal_has_location`/case-access checks) is by design.
- **Disposition:** **leave untouched, listed as deferred.** Each one's internal
  authz gets full verification + the admin/clinic/anon test matrix in the *phase
  that builds its write workflow* (P3C.4+). Their 7 WARNs remain accepted until
  then, documented here so they are not mistaken for new regressions.

### C.3 Leaked-password protection (separate — Auth, not a DB RPC)

Tracked independently from RPC hardening: enable HaveIBeenPwned check in
Supabase Auth (dashboard toggle / Auth config). No SQL, no code. Can be toggled
at gate 2 or any time; not a slice blocker.
Ref: <https://supabase.com/docs/guides/auth/password-security>

---

## D. Synthetic test-data plan (no real PHI)

Most of the fixture **already exists** (migration 010, all `@portal.test`):
1 admin + 2 clinic_user + 2 reception_user, scoped to `al_kawther / romance /
sheraton / tropitel`. Proposed additions are minimal.

| Fixture | Status | Action |
|---|---|---|
| Canonical admin (synthetic) | exists (`portal_user_profiles.role=admin`, `@portal.test`) | reuse for automated RLS tests |
| Clinic user on clinic A | exists (clinic_user scoped `romance`) | reuse |
| User on a different clinic B | exists (clinic_user/reception scoped `tropitel`/`sheraton`) | reuse |
| Authenticated user with **no** canonical profile | **add** | one `@portal.test` `auth.users` with **no** `portal_user_profiles` row → tests the deny path (B.6) |
| Synthetic legacy case (admin-only visible) | **add (1)** | one `portal_cases` row `admin_only_legacy_case=true` + synthetic `portal_patients` (`is_legacy=true`, masked name `TEST LEGACY …`) under a dedicated synthetic batch, so `/admin/legacy` shows a non-empty state and non-admin denial is testable |

**All synthetic rows must be:**
- **Unmistakably marked:** deterministic UUID prefixes (`a/d/e0000000-…`),
  `@portal.test` emails, `TEST…` display/patient names, a dedicated synthetic
  `legacy_import_batch_id`.
- **Easily removable:** extend migration 010's existing commented ROLLBACK block
  (it already deletes the seed by exact UUID) to cover any new synthetic row.
- **Excluded from KPIs:** see §F.

No real Master Sheet data, no real patient rows, no real staff in P3C.2.

---

## E. First frontend cutover slice (smallest safe, read-only, additive)

**Design principle:** the slice is **purely additive** under a new admin-only
route — it changes **zero** existing behavior. Existing `portal`-schema pages
(`dashboard`, `cases`, `inbox`, `admin/users`, `lib/auth.ts`) are **untouched**.
This keeps blast radius and rollback trivial. (The eventual global replacement of
`lib/auth.ts` and the schema flip of the shared clients is a *later* phase,
intentionally excluded here because it touches all pages at once.)

> A canonical (`public`) client temporarily coexists with the existing `portal`
> client. This is an **intentional, transitional** bridge for the cutover — not a
> return to the rejected two-backend state — and collapses to public-only when
> later phases migrate the remaining routes.

> **Next.js caution (`hmc-portal/AGENTS.md`):** this Next.js version diverges from
> training data. Before writing slice code (gate 4), read the relevant guide in
> `node_modules/next/dist/docs/` (server client, middleware, server actions).

### E.1 File-level plan

| File | Current `portal.*` | New canonical `public.portal_*` | Change | Rollback |
|---|---|---|---|---|
| `lib/supabase/types.public.ts` | — | regenerated `public` Database types (33 `portal_*` tables) via `generate_typescript_types` | **NEW** (additive) | delete file |
| `lib/supabase/canonical.ts` | — | `createCanonicalServerClient()` typed `<Database,"public">`, `db.schema:"public"`, **user JWT only** (anon/publishable key) | **NEW** | delete file |
| `lib/auth-canonical.ts` | (analogue of `lib/auth.ts requireProfile`/`requireAdmin`, which read `portal.profiles`) | `requireCanonicalAdmin()`: session → `SELECT … FROM public.portal_user_profiles WHERE user_id = auth.uid()` (allowed by `portal_user_profiles_sel`) → require `role='admin' AND active`, else redirect/403 | **NEW** | delete file |
| `app/admin/legacy/layout.tsx` | — | server layout calling `requireCanonicalAdmin()` | **NEW** | delete route |
| `app/admin/legacy/page.tsx` | — | **read-only**: counts/empty-states from `public.portal_cases WHERE admin_only_legacy_case=true` + `public.portal_legacy_import_batches` + `public.portal_insurance_case_status_history` | **NEW** | delete route |

No edits to existing files; no service-role usage; no writes.

### E.2 Expected results

- **Admin** (real, bridged per B.3; or synthetic admin in tests) logs in → opens
  `/admin/legacy` → guard passes → sees legacy KPIs/empty-state (or the one
  synthetic legacy case from §D). Console/network clean.
- **Clinic/reception user** → guard denies (redirect to existing dashboard); even
  if routed directly, RLS returns **0** legacy rows.
- **Authenticated user with no canonical profile** → guard denies; RLS denies.
- **Anonymous** → existing middleware redirects to `/login`.

### E.3 Verification (gate 5, local only)

Local `next dev`; sign in as each synthetic role; confirm the E.2 matrix; check
server logs + browser console/network for errors; confirm no service-role key in
client bundle. No public deploy.

---

## F. Migration-010 synthetic seed handling

**Do not delete or alter it in P3C.2.** Deterministic identifiers (live-verified):

- Case: **`e0000000-0000-4000-8000-000000000001`** (`our_ref=null`,
  `source_type='portal_registration'`, `admin_only_legacy_case=false`,
  `visit_date=2026-05-28`).
- Patient: **`d0000000-0000-4000-8000-000000000001`** (`is_legacy=false`).
- Synthetic auth users: `@portal.test` (admin `a0000000-…0001` + 2 clinic_user +
  2 reception_user); scopes on `al_kawther/romance/sheraton/tropitel`.

**KPI exclusion during development (must not silently enter real KPIs):**
- **Short term:** every dashboard / Active-Follow-Up / legacy KPI query excludes
  the known synthetic set — by deterministic UUID list **or** by
  `created_by`/`user_id` resolving to a `@portal.test` `auth.users` row.
- **Medium term (before real data, future migration — not now):** add an explicit
  `is_synthetic boolean NOT NULL DEFAULT false` marker on
  `portal_cases`/`portal_patients` so exclusion is a single predicate rather than
  a UUID allowlist.

**Cleanup checkpoint (future, owner-approved):** before the first **real** legacy
import, delete/archive all synthetic rows via migration 010's existing ROLLBACK
block (extended for any §D additions). Requires explicit Mohamed approval; not
part of P3C.2.

---

## G. Execution gates (each gate stops for approval)

| Gate | Deliverable | Restriction / rollback |
|---|---|---|
| **1. Proposal (this doc)** | This document. | Documentation only. **← we are here. STOP for approval.** |
| **2. Auth/profile bridge migration** | One migration: insert real-admin `portal_user_profiles` row (B.3); add the §D synthetic deny-path user + 1 synthetic legacy case; (optional) enable leaked-password (C.3). **No** changes to the 5 helpers (C.1a) and **no** touch to the 7 RPCs (C.2). | After approval only. Rollback = paired DELETE by exact uid/UUID. `portal` schema untouched (read-only SELECT for uid resolution). |
| **3. Supabase synthetic verification** | Run the §C RLS test matrix (admin succeeds / clinic_user restricted / no-profile + anon denied) with synthetic users; re-run `get_advisors` to confirm no new findings; confirm service-role key absent from client. | Read-only verification. |
| **4. Minimal read-only frontend slice** | The 5 additive files in §E.1 (`/admin/legacy`, canonical client, guard, public types). No writes, no service role, existing routes untouched. | **Separate** approval after gates 2–3. Rollback = delete new files. |
| **5. Local verification** | Local `next dev` run of the E.2 matrix; logs/console/network clean. | **No public deploy.** |
| **6. Hard stop** | — | **Stop before** Legacy Import UI, any real Excel/PHI work, and any create/update/status-edit workflow. |

Follow-ups explicitly **after** P3C.2 (tracked, not now): C.1b helper relocation
to an unexposed schema; per-RPC authz verification when write workflows are built;
`is_synthetic` marker migration; broad `lib/auth.ts`/shared-client schema flip;
Admin Legacy workspace (E of P3C.1); Excel Import workspace (F of P3C.1).

---

## Restrictions reaffirmed (still active)

- No migration execution yet. No frontend code changes yet. No real PHI. No real
  staff onboarding. No public deploy. No Excel upload/import feature yet. No
  status edits. No deletion of the test seed. Do not alter or drop the
  non-canonical `portal` schema. Do not touch `hmc-v2`, Invoice Manager, PDF
  engines, OneDrive patient folders, the public GitHub Pages demo, or the active
  Master Sheet.

**STOP — awaiting Mohamed's approval of this P3C.2 proposal before gate 2.**
