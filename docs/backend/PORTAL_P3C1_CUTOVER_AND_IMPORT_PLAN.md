# PORTAL P3C.1 — Canonical Backend Cutover & Admin Import (IMPLEMENTATION PLAN)

**Type:** PLAN / DOCUMENTATION ONLY. No migrations, no frontend code, no real
PHI, no deploy in this step. Produced after **Option A was owner-approved**
(see `PORTAL_P3B_DECISION_LOG.md` → "P3C.0 — DECISION").

**Canonical decision being implemented:**
- **Frontend:** `hmc-portal` (authenticated Next.js) = the one real Portal.
- **Backend / single source of truth:** `public.portal_*` in **`hmc-medical`**
  (`zlgxalmaiwatnoydgkxo`).
- The `portal` schema (7 tables) is **non-canonical**; parked, not yet retired.
- Admin Excel Import targets **`public.portal_legacy_*`** directly. The old
  "port 012 into the `portal` schema" step is **dropped**.

**Grounding (live read-only verification, 2026-05-28, catalog/aggregate only):**
- `public.portal_*` = 33 tables + 1 view (`portal_treasury_balances`), RLS on all,
  migrations `001`–`014`.
- Legacy tables all **0 rows**; `public.portal_cases`=1 + `public.portal_patients`=1
  are the **migration-010 synthetic seed**; `portal.cases`=0 (no real cases).
- `portal` config to carry/retire: `clinics`=8, `profiles`=6 (1 active admin + 5
  inactive nurse), `admin_bootstrap`=2; everything else in `portal` is 0.
- Security advisor: **0 ERROR**, **12 WARN** SECURITY DEFINER fns + **1 WARN**
  leaked-password protection off.
- Migration `012` created the 4 legacy tables (`source_file_hash`,
  `matched_existing_case_id` present) but **defines no import RPCs** and has **no
  `source_content_hash` column** → those are net-new in P3C.4.

---

## 0. Reading order / inputs

This plan consumes (do not re-derive):
- `PORTAL_P3C0_SCHEMA_ALIGNMENT_REPORT.md` — the audit behind Option A.
- `PORTAL_BACKEND_ARCHITECTURE.md` — the `public.portal_*` design.
- `PORTAL_P3C_ADMIN_LEGACY_IMPORT_PLAN.md` — the import feature design (its
  Decision-0 "port 012 into portal" is now superseded by Option A).
- `PORTAL_MASTER_SHEET_LEGACY_IMPORT_MAPPING.md` — column mapping + status
  normalization for the import.
- `hmc-smc-portal-ui-demo/supabase/migrations/001–014` — the canonical DDL.
- `_p3b_legacy_import/import_master_sheet_legacy.py` — the validated parity
  oracle (classification + hashing).

---

## A. Frontend / data-layer cutover (`hmc-portal` → `public.portal_*`)

### A.1 The four Supabase clients (the schema pin)

All four clients hard-pin `db: { schema: "portal" }` and type as
`<Database, "portal">`. Cutover repoints every one to `public` + the canonical
`Database` types:

| File | Line | Today | After |
|---|---|---|---|
| `lib/supabase/server.ts` | 10–14 | `createServerClient<Database,"portal">`, `db:{schema:"portal"}` | `<Database,"public">`, `db:{schema:"public"}` (or drop `db` → default `public`) |
| `lib/supabase/middleware.ts` | 13–17 | same | same |
| `lib/supabase/admin.ts` | 21–22 | `createClient<Database,"portal">`, `db:{schema:"portal"}` | `<Database,"public">`, public |
| `lib/supabase/client.ts` | 10 | `{ db:{schema:"portal"} }` | public |
| `lib/supabase/types.ts` | whole file | hand-written `portal` `Database` (flat `cases`, 3 roles) | regenerate from `public.portal_*` (`generate_typescript_types`) or hand-author the `public` shape; replace `UserRole`/`CaseStatus` etc. |

> Note: PostgREST must expose `public` (it does by default). The earlier
> `expose_portal_schema_to_postgrest` migration added `portal`; no change needed
> to keep `public` exposed.

### A.2 Read/write operation map (every current `portal.*` touchpoint → canonical)

| # | Where (file:line) | Current op (`portal`) | Canonical target (`public.portal_*`) | Notes / shape change |
|---|---|---|---|---|
| 1 | `lib/auth.ts:18` `requireProfile` | read `profiles` by `id = user.id` | `portal_user_profiles` by **`user_id = auth.uid()`** | PK/col rename `id`→`user_id`; role enum remap (A.3) |
| 2 | `lib/auth.ts:28` | read `clinics` by `id = clinic_id` | `portal_locations` (+ `portal_billing_facilities`) | single `clinic_id` → **multi** `portal_user_location_scopes` (A.4) |
| 3 | `lib/supabase/middleware.ts:50` | read `profiles` (`is_active, role`) | `portal_user_profiles` (`status`, `role`) by `user_id` | gate logic identical; field source changes |
| 4 | `app/pending/page.tsx:14` | read `profiles` | `portal_user_profiles` | as #1 |
| 5 | `app/dashboard/page.tsx:57,68` | read `cases` (list + count by `status`) | `portal_cases` ⋈ `portal_patients` (+ `portal_encounters`) | `patient_name` now a join to `portal_patients.first/last_name`; clinic-`status` semantics change (A.5) |
| 6 | `app/dashboard/page.tsx:76` | read `clinics` (filter) | `portal_locations` | filter by location, not clinic |
| 7 | `app/cases/[id]/page.tsx:22` | read `cases` `select *` | `portal_cases` + `portal_patients` + `portal_insurance_intakes` (+ admin-only `portal_insurance_billing_preparations`) | flat row → composed read; SC%/currency/excess move to **admin-only** prep (A.6) |
| 8 | `app/cases/new/page.tsx:14,19` | read `insurance_companies`, `clinics` | `portal_insurance_companies`, `portal_locations` | — |
| 9 | `app/cases/new/actions.ts:84` | insert `cases` (flat, inline patient) | `portal_patients` insert → `portal_create_case_with_ref(...)` (or `portal_cases` insert) → `portal_encounters` → `portal_insurance_intakes` | one insert becomes a small transaction across patient/case/encounter/intake |
| 10 | `app/cases/new/actions.ts:107` | insert `payments` (cash sub-methods) | `portal_case_charges` + `portal_record_collection()` RPC (→ `portal_collections` + `portal_treasury_movements`) | **write path changes to a SECURITY DEFINER RPC** |
| 11 | `app/cases/new/actions.ts:72–82` | transfer via `status='transferred'` + `transferred_to_clinic_id` | `portal_cases.route` (`transfer_to_al_kawther/_sheraton/_other`) + `portal_transfers` | dedicated transfer table |
| 12 | `app/inbox/page.tsx:24,36` | read `cases` (transferred to my branch) + `clinics` | `portal_transfers` ⋈ `portal_cases` + `portal_locations` | scoped by `portal_has_location()` |
| 13 | `app/inbox/actions.ts:34,85` | update `cases` (`received_at_branch`) | `portal_transfers` (received) + `portal_cases.current_location_id` | — |
| 14 | `app/inbox/actions.ts:104` | insert `payments` | `portal_record_collection()` | as #10 |
| 15 | `app/admin/users/page.tsx:22,27` | read `profiles`, `clinics` | `portal_user_profiles`, `portal_locations` (+ scopes) | — |
| 16 | `app/admin/users/actions.ts:20` | update `profiles` (activate/role) | `portal_user_profiles` (`status`/`role`) + `portal_user_location_scopes` | — |
| 17 | `app/admin/users/new/actions.ts:45–67` | `auth.admin.createUser` → trigger inserts `profiles` → patch | `auth.admin.createUser` → **explicit insert** `portal_user_profiles` + `portal_user_location_scopes` | **no `public` signup trigger exists** (B.2) |
| 18 | `app/admin/insurance-companies/page.tsx:20` + `actions.ts:22,42` | read/insert/update `insurance_companies` | `portal_insurance_companies` (+ assistance → `portal_local_assistance_companies`) | — |
| 19 | helper fns referenced in `types.ts:191` | `current_role`, `current_clinic_id`, `is_admin`, `is_active_user` (portal) | `portal_current_role`, `portal_is_admin`, `portal_is_active_user`, `portal_has_location` | **no `current_clinic_id`** in canonical → use location scopes |
| 20 | `case_files` (typed but unused) | — | not in P3A scope | flag: storage model TBD; out of cutover scope |

There are **no `.rpc()` calls in the app today** — all reads/writes are direct
table ops. Cutover deliberately introduces RPCs for money writes (#10, #14).

### A.3 Role remap

`portal` `user_role` → `public` `portal_role`:
`nurse → clinic_user`, `branch_staff → reception_user`, `admin → admin`.
Reserved canonical roles (owner/insurance_staff/treasury/nurse/doctor/
viewer_auditor) stay unused until needed. All app role checks
(`requireAdmin`, middleware `role !== 'admin'`, dashboard `isAdmin`) keep working
on `admin`; non-admin branches map to clinic_user/reception_user.

### A.4 Clinic → location model

`portal.clinics`(8: HMC main×2, SMC×1, External×5) maps onto
`portal_locations`(9) + `portal_billing_facilities`(HMC/SMC). The app's single
`profile.clinic_id` becomes **0..n** `portal_user_location_scopes` rows. RLS
scoping shifts from "my clinic_id" to `portal_has_location()` /
`portal_can_access_case()`. Reconcile the 8↔9 mapping in C.

### A.5 Case status semantics (needs an explicit decision)

The app's flat 7-state clinic workflow (`pending_review → transferred →
received_at_branch → in_progress → invoice_generated → closed/cancelled`) has **no
single canonical column**. Canonical splits the concept across
`portal_cases.route` (transfer state), `portal_transfers` (received), and — for
insurance — `portal_insurance_case_status_history` (13-state GOP→Paid).
**Decision needed (P3C.2):** either (a) add a `portal_cases.workflow_status` enum
to preserve the clinic dashboard's existing states, or (b) derive the dashboard
chips from route + transfer + intake presence. Recommended: (a) — smallest UI
change, keeps the dashboard visually identical.

### A.6 Two-stage insurance privacy (behavioral change)

Today SC%/currency/excess/our_ref live inline on `cases` and are readable by
whoever can read the case. Canonical splits this: clinic-visible **Stage 1**
(`portal_insurance_intakes`) vs **admin-only Stage 2**
(`portal_insurance_billing_preparations` — SC%, invoice currency, local
assistance, future invoice value). The New Case form must stop collecting
admin-only fields from clinic users; those move to an admin completion screen.

### A.7 UI routes that can stay visually as-is (data layer only)

`login`, `auth/callback`, `signout`, `pending`, `admin/insurance-companies`,
`cases/[id]` (read-only view), and the **dashboard list/stat cards** (still
"name · date · status badge · payment badge") — cosmetics unchanged; only the
query source changes.

### A.8 UI routes that need redesign (richer canonical workflow)

- `cases/new` — flat form → patient + case + encounter-pattern + Stage-1 intake;
  remove admin-only billing fields (A.6).
- `inbox` + `inbox/[id]` (classify) — transfer model moves to `portal_transfers`
  + route; receive/classify rewritten.
- `admin/users` + `admin/users/new` — single clinic → **multi-location scopes**;
  3 roles → canonical role set; provisioning without the portal trigger (B.2).
- `dashboard` status filters — depend on the A.5 decision.

---

## B. Authentication & user provisioning

### B.1 Login & session (low change)

Supabase Auth + `@supabase/ssr` + middleware stay. `auth.users` is shared by
both schemas, so **existing logins survive cutover**. Only the profile lookup
moves: `portal.profiles.id` → `portal_user_profiles.user_id` (helpers in
`lib/auth.ts` + `middleware.ts`). Active/role gating logic is unchanged.

### B.2 Provisioning gap — no `public` signup trigger

`createUser` (admin/users/new/actions.ts) today relies on the **`portal`-only**
trigger `tg_on_auth_user_created` to pre-insert a profile, then patches it. The
canonical `public` model has **no such trigger** (profiles are seeded). Two
options:

1. **(Recommended) Drop the trigger dependency.** After
   `admin.auth.admin.createUser(...)`, the server action **explicitly inserts**
   `portal_user_profiles` (role, status) + the chosen `portal_user_location_scopes`
   in one step. Deterministic, no hidden DB side-effect, easy to test.
2. Add an equivalent `public` signup trigger (mirror of the portal one). Keeps
   the current "create→patch" shape but reintroduces hidden state.

Self-service signup (Google OAuth, if/when enabled) would still need a trigger or
a callback-time insert that creates an **inactive** profile awaiting admin
activation — same "pending" gate the app already has.

### B.3 Admin bootstrap (safe)

Re-establish the **one active admin** from `portal.profiles` as a
`portal_user_profiles` row with `role='admin'` against the **same `auth.users`
id** (login unchanged). Bootstrap mechanics, in order of preference:
- a one-row, idempotent `public` bootstrap migration keyed on the known admin
  `auth.users.id` (no password handling — Auth owns that); or
- a guarded `portal_admin_bootstrap()`-style RPC mirroring the existing
  `portal_add_has_excess_and_secure_bootstrap` pattern.
The 5 **inactive** nurse profiles are not auto-migrated — re-provision fresh via
B.2 only if still employed (decide in C).

### B.4 Clinic/reception provisioning & restriction

Admin assigns each user a role (clinic_user/reception_user) + one or more
`portal_user_location_scopes`. RLS then restricts them via `portal_has_location()`
/ `portal_can_access_case()`; admin-only tables (billing preparations, legacy,
treasury writes) stay closed to them. No clinic/reception visibility of legacy
insurance cases (reaffirmed restriction).

### B.5 Service-role key — never in the browser (verify + keep)

`createAdminClient()` reads `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_`
prefix) and is imported **only** by `requireAdmin()`-guarded server actions.
Cutover keeps this invariant and adds a guardrail: a lint/CI check that
`lib/supabase/admin.ts` is never imported from a client component or any
`NEXT_PUBLIC_` path, and that the service key never appears in a client bundle.
Prefer session-client + SECURITY DEFINER RPCs over the service-role client for
the import (F).

### B.6 SECURITY DEFINER advisor WARNs — hardening & test plan

The **12 WARN** functions split into two groups; treat them differently:

**Group 1 — policy/boolean helpers (5):** `portal_is_admin`,
`portal_is_active_user`, `portal_has_location(uuid)`, `portal_can_access_case(uuid)`,
`portal_current_role`. Used inside RLS policies. They leak nothing (booleans/role
about the *caller's own* status) but are needlessly REST-callable.
- **Remediation:** remove them from the PostgREST-exposed API surface (move to a
  non-exposed `portal_private` schema, policies referencing them schema-qualified)
  **or** accept with a written justification. Either way **must be RLS-tested**
  (B.7) — moving schemas can break policy evaluation if done carelessly, so prove
  policies still pass before relying on it.

**Group 2 — business write RPCs (7):** `portal_record_collection`,
`portal_record_expense`, `portal_record_nurse_shift`, `portal_end_nurse_shift`,
`portal_record_doctor_duty`, `portal_confirm_visa_handover`,
`portal_create_case_with_ref`. These are the **intended** authenticated write
path. The WARN is expected.
- **Remediation:** keep EXECUTE for `authenticated`; confirm each (i) re-checks
  authorization internally (`portal_is_admin()`/scope) at the top, (ii) has a
  locked `search_path`, (iii) is covered by an **abuse test** (an out-of-scope
  authenticated user calling the RPC directly must be rejected by the internal
  check, not merely by table RLS). Document as accepted risk + compensating
  control.

**+1 WARN:** enable **Leaked Password Protection (HIBP)** in the Auth dashboard
before any production login (not fixable via SQL; noted in migration 011).

Migration `011` already revoked EXECUTE from `public`/`anon` on all `portal_*`
fns and from 4 deep-internal helpers — this plan builds on that, it does not undo
it.

### B.7 Auth/RLS test plan (synthetic, pre-PHI)

Extend `supabase/tests/portal_security_verification.sql`: for each of admin /
clinic_user / reception_user / anon, assert read+write allowed only within scope;
admin-only tables (billing prep, all `portal_legacy_*`) denied to non-admin + anon;
status-history + audit + treasury-movement immutable; Group-2 RPC abuse tests.
All against the synthetic seed only.

---

## C. Non-canonical `portal` schema disposition

### C.1 Inventory (live, 2026-05-28)

| `portal` object | rows | Real config? | Proposed disposition |
|---|---|---|---|
| `clinics` | 8 | yes | **Re-seed/map** into `portal_locations`(9) + `portal_billing_facilities`; reconcile 8↔9 |
| `profiles` | 6 | 1 active admin + 5 inactive nurse | **Re-establish** the 1 admin in `portal_user_profiles` (B.3); inactive nurses **retire** unless still needed |
| `admin_bootstrap` | 2 | bootstrap state | **Retire** — superseded by `public` bootstrap (B.3) |
| `insurance_companies` | 0 | — | nothing to migrate |
| `cases` | 0 | — | nothing to migrate |
| `payments` | 0 | — | nothing |
| `case_files` | 0 | — | nothing |

So the **entire** real-config carry is: 8 clinics + 1 admin. Everything else is
empty or retired.

### C.2 Rules

- **Do not delete, drop, or alter** anything in `portal` in P3C.1.
- Park `portal` read-only after cutover until `public` is verified (P3C.5).
- **Future deprecation (separately approved, P3C.6+):** a `wipe_portal_schema`
  migration mirroring the earlier `wipe_public_schema_keep_portal`.

### C.3 Rollback

Before any future wipe: take a full `pg_dump` of the `portal` schema (schema +
data) stored privately; keep the cutover behind a git branch + reversible
migrations so the app can be repointed back to `portal` if `public` cutover
fails UAT. The same `auth.users` makes a revert low-risk.

---

## D. Existing test/demo seed cleanup (`public.portal_cases`=1, `portal_patients`=1)

### D.1 Positive identification **without** reading PHI

The seed is migration **`010_portal_test_seed_and_verification`** — fully
deterministic and self-labeling. Identify by lineage/markers, never by name/DOB:
- fixed UUIDs: patient `d0000000-0000-4000-8000-000000000001`, case
  `e0000000-0000-4000-8000-000000000001`, test users `*0000000-0000-4000-8000-…`;
- markers: `portal_user_profiles.display_name LIKE 'TEST %'`,
  `auth.users.email LIKE '%@portal.test'`, `portal_staff.staff_code LIKE 'TEST-%'`;
- `created_by` = the Tropitel test user id.

A count/identify query selects only `id`/marker columns → no PHI through any tool.

### D.2 Delete vs archive

Recommend **DELETE** — it is 100% synthetic and reproducible by re-running 010.
Migration 010 already ships a commented **ROLLBACK block** that removes exactly
these rows (cases → patients → staff assignments → staff → scopes → profiles →
`@portal.test` auth users). Execute that block as a small, owner-approved down
step (with before/after counts) rather than ad-hoc deletes.

### D.3 Approval checkpoint (explicit)

**Do not remove yet.** Removal happens only at a dedicated checkpoint —
recommended just before the first synthetic E2E import run in P3C.4 (so tests
start from a clean operational table), or at latest before the P3C.6 real import.
Gate: explicit "remove test seed now" from Mohamed; run as its own reversible
step; print `portal_cases`/`portal_patients` counts before (expect 1/1) and after
(expect 0/0).

### D.4 KPI cleanliness verification

Legacy KPIs (Active Follow-Up / Paid-Closed / Not-Previously-Assigned / Needs
Review) source **only** from `portal_legacy_*` + admin-only legacy cases —
currently all 0, so they are **already** free of the seed (the seed lives in the
operational `portal_cases`, not the legacy tables). After D.2, assert: legacy KPIs
= 0 across the board, and the operational dashboard shows 0 cases. Add this as an
explicit post-removal check.

---

## E. Admin Legacy Insurance Cases workspace (`public.portal_*`, admin-only)

Built on the existing P3A/P3B model — **no duplicated module**.

### E.1 Backend (already present in `012`, RLS admin-only)

`portal_legacy_import_batches`, `portal_legacy_case_staging`,
`portal_legacy_import_exceptions`, `portal_insurance_case_status_history`, with
promoted rows in `portal_cases` (admin-only legacy lineage via
`matched_existing_case_id`). RLS = `portal_is_admin()` only; anon/clinic/reception
denied (verified in B.7).

### E.2 Pages (all under `app/admin/legacy/*`, `requireAdmin()`-guarded)

| Page | Source query (admin-only) |
|---|---|
| **Legacy cases table** | all promoted legacy `portal_cases` (+ batch lineage) |
| **Active Follow-Up** | legacy cases whose normalized status ∈ open/unpaid set |
| **Paid / Closed Historical** | normalized status ∈ {paid, closed} |
| **Not Previously Assigned** | `our_ref IS NULL` legacy cases |
| **Needs Review / Exceptions** | `portal_legacy_import_exceptions` + staging `validation_status='exception'` |
| **Case detail** | one legacy case + its intake/prep + batch provenance |
| **Status history timeline** | `portal_insurance_case_status_history` for the case (append-only) |
| **Status update action** | append a history row (`source_type='admin_manual_update'`) + `portal_audit_log` via `portal_audit()`; never mutate history in place |

KPIs come from these queries only (D.4). Reuse `AppShell`/`Card`/`Badge`/
`EmptyState`/`Button` + server actions (matching `app/admin/*` patterns).

### E.3 Classification (reused, not re-derived)

Active vs Paid/Closed vs Not-Previously-Assigned vs Exceptions follows the
**validated P3B logic** (the Python `classify()`/`summarize()` oracle): only
unpaid/open count in Active Follow-Up; no-OUR-Ref → Not Previously Assigned
(never invent a ref); duplicate-ref + missing-identity → Exceptions; soft flags
(missing insurer/currency/DOB) imported with NULLs + flagged.

---

## F. Excel Import workspace (`/admin/legacy-import`, synthetic until closing snapshot)

Self-service admin import of a **frozen** Master Sheet snapshot, targeting
`public.portal_legacy_*` directly.

### F.1 Net-new backend (012 has tables only)

- **Additive migration:** add `source_content_hash text` to
  `portal_legacy_import_batches` (012 has only `source_file_hash`) +
  `inspection_only boolean` for ANALYZE rows.
- **Author SECURITY DEFINER RPCs** (none exist in 012), each `portal_is_admin()`
  gated + locked `search_path`, single transaction:
  - `portal_import_legacy_batch(p_payload jsonb, p_file_hash text, p_content_hash text, p_source_name text, p_sheet text)` → batch + staging + exceptions + promoted cases + initial status history; returns **PHI-safe aggregate** only.
  - `portal_rollback_legacy_batch(p_batch_id uuid)` → deletes a batch's rows **only if** no post-import admin edits/status changes exist (else refuses + lists conflicts).
  - `portal_reconcile_legacy_batch(p_batch_id uuid)` → computes re-import diff into staging; applies nothing until admin approves.
- These RPCs are Group-2 functions (B.6): keep authenticated EXECUTE, prove
  internal admin re-check via abuse tests.

### F.2 Pipeline (parse → validate → hash → classify), PHI server-side only

- **Parser:** pinned Node xlsx reader (SheetJS/exceljs); read **only** the
  configured insurance worksheet (`Master Sheet`); `.xlsm` macros never executed
  (cell values only).
- **Structure validation:** assert worksheet + mapped header columns match
  `PORTAL_MASTER_SHEET_LEGACY_IMPORT_MAPPING.md`; abort (PHI-safe error) on drift.
- **Hashing:** file hash = SHA-256 of bytes; content hash = SHA-256 over
  normalized case cells — **must equal the Python `whole_file_hash()`/
  `content_hash()`** for cross-tool parity. Stored on the batch, shown masked.
- **Classification:** TS port of `classify()`, locked by a **parity test** vs the
  Python oracle (identical promote/exception/no-ref/missing-insurer/
  invalid-currency/missing-DOB/duplicate counts).
- **PHI path:** browser → local Next server action → Supabase RPC. Never through
  Claude/MCP. Runs **locally only**; not on the public GitHub Pages demo.

### F.3 ANALYZE vs COMMIT

ANALYZE writes nothing (or only an `inspection_only` batch row: hashes + counts,
no PHI) and returns the preview. COMMIT runs `portal_import_legacy_batch`. An
explicit confirm click is required between them ("Import N cases").

### F.4 PHI-safe preview (aggregates only)

total rows · promotable · preserving OUR-Ref · Not-Previously-Assigned · Paid/
Closed · Active Follow-Up · soft-flags (missing insurer / invalid currency /
missing DOB / no-ref) · duplicate exceptions · missing-critical exceptions ·
masked file hash + content hash. No names anywhere.

### F.5 Re-import / reconciliation (no blind overwrite)

Per `PORTAL_P3C_ADMIN_LEGACY_IMPORT_PLAN.md` §6: match by **exact `our_ref`** →
NEW / STATUS_UPDATE / FIELD_CHANGE / CONFLICT / UNCHANGED; no-ref → stable
fingerprint (name+DOB+visit+insurer+invoice amount) → propose-link (admin
confirms) / AMBIGUOUS / NEW; never auto-delete missing rows (flag only); every
applied change writes audit + (for status) a history row. A **Reconciliation
Review** screen shows masked per-row proposed actions; approved actions apply in
one transaction.

### F.6 Rollback by batch ID

`portal_rollback_legacy_batch(batch_id)` available until admin status edits begin;
guarded against destroying post-import admin work (F.1).

### F.7 Synthetic-only testing

Deterministic synthetic `.xlsm` generator (same 18-col layout, obviously-fake
patients, known distribution incl. exactly one duplicate-ref pair, one junk
currency, missing-insurer/DOB, a spread of statuses) + a "newer snapshot" variant
for reconciliation. Tests: parity (TS vs Python), hashing equality, RLS denial,
E2E (upload→analyze→commit→rollback→re-import→reconcile→status change→history).

---

## G. Implementation phases & stop gates

Each phase is a separate, separately-approved sprint. **Plan/doc only now** — no
code until each gate is approved.

| Phase | Scope | Real PHI? | Exit gate (stop) |
|---|---|---|---|
| **P3C.1** *(this doc)* | Cutover + import implementation **plan** only | No | Owner reviews/approves this plan |
| **P3C.2** | Auth/profile/RLS **hardening plan** + synthetic test harness design; A.5 status decision; B.6 advisor remediation choices; C 8↔9 mapping | No | Decisions locked; security test plan approved |
| **P3C.3** | Refactor `hmc-portal` data layer `portal`→`public.portal_*` (clients, types, A.2 ops, B auth) on **synthetic data only**; local dev Supabase or a dev branch | No (synthetic) | App runs on `public` locally; B.7 RLS verification green; `portal` still parked |
| **P3C.4** | Build Admin **Legacy Cases** (E) + **Excel Import** (F) UI + net-new RPCs/migration; **synthetic `.xlsm` only**; **test-seed removal** (D) gated here | No (synthetic) | E2E import + reconciliation green; parity vs Python oracle green |
| **P3C.5** | Security + **UAT verification locally** (full RLS suite, advisor re-run = target 0 ERROR / WARNs justified, HIBP enabled, service-role bundle check) | No (synthetic) | UAT sign-off; cutover reversibility proven |
| **P3C.6** | **Gated real import** from `Master Sheet New - Closing Snapshot 31-05-2026.xlsm`; dual-tool parity dry-run; then retire `portal` (C.2) | **Yes — owner-run, approved** | Post-import aggregates verified; rollback window noted |

### G.1 Recommended safe sequence & rollback points

1. Work each phase on its **own git branch**; never refactor + build new features
   in the same branch.
2. Keep all DB changes as **reversible, additive migrations**; no destructive
   change to `portal` until P3C.6 (and only then, owner-approved, after a dump).
3. **P3C.3 is the riskiest** (auth + data layer). Rollback = repoint the 4
   clients back to `schema:"portal"` and redeploy the prior branch; `auth.users`
   shared → logins unaffected.
4. **Gate the cutover behind an env flag** (e.g. `PORTAL_BACKEND=public|portal`)
   during P3C.3–P3C.5 so a regression is a config flip, not a redeploy.
5. **Remove the test seed (D) only after** P3C.4 E2E proves the import path, so
   tests run against a clean table but the seed is available for earlier RLS
   tests.
6. **Real import (P3C.6) is last and owner-run**, never before P3C.5 UAT is green,
   never from a live/moving Master Sheet — only the frozen closing snapshot.

---

## Restrictions still active (reaffirmed)

- Plan/documentation only in this step. No new migrations. No frontend code. No
  real PHI import. No public deploy.
- Do **not** connect the public GitHub Pages demo to Supabase.
- Do **not** alter or delete the existing test seed yet.
- Do **not** drop or modify the non-canonical `portal` schema yet.
- Do **not** touch `hmc-v2` (`gynsbdiofcizwbymzppq`) or `PS Shop`.
- Do **not** touch Invoice Manager, the PDF engines, OneDrive patient folders, or
  the active Master Sheet (read-only, no sync-back).
- Synthetic data only until the approved 31-05 closing snapshot.
- No service-role key in any browser/frontend bundle.

**STOP — awaiting Mohamed's review of this P3C.1 plan before any P3C.2+ work.**
