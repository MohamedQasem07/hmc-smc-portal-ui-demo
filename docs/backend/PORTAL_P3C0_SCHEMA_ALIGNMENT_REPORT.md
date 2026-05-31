# PORTAL P3C.0 — Backend / Schema Alignment Decision Report

**Type:** read-only audit + recommendation. **No schema target approved, no
migrations, no code, no PHI.** Stops for owner approval.

**Method / safety:** read-only inspection of the approved project
`hmc-medical` (`zlgxalmaiwatnoydgkxo`) via catalog + aggregate SQL only (no PHI
columns selected). `hmc-v2` (`gynsbdiofcizwbymzppq`) and `PS Shop`
(`iiiacdhlgixkwzykthrl`) were **not** queried. No secrets reproduced here.

---

## 1. Frontend posture (`hmc-portal`)

- **Local-only, not deployed.** Empty `next.config.ts` (no static export /
  basePath), `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, no
  vercel/netlify/Docker/CNAME/CI config, README is default `create-next-app`.
- **Intended purpose** (inferred from routes): the real operational clinic
  Portal — `login`, `dashboard`, `cases`, `cases/new`, `inbox`, `admin/users`,
  `admin/insurance-companies`. Server-rendered (`@supabase/ssr` + middleware
  auth), needs a Node host (not GitHub Pages).
- **Target backend:** `NEXT_PUBLIC_SUPABASE_URL → zlgxalmaiwatnoydgkxo`
  (= hmc-medical, the approved project) using **schema `portal`**
  (`NEXT_PUBLIC_SUPABASE_DB_SCHEMA=portal`). Service-role key is server-only
  (`SUPABASE_SERVICE_ROLE_KEY`, no `NEXT_PUBLIC_` prefix). No secret values shown.

## 2. The project hosts BOTH models (root cause of the fork)

`hmc-medical` contains two parallel schemas. The migration history explains how:

- **Apr–May 17:** large operational build in `public` (staff, HR/attendance,
  geofence, shift schedules, 60-employee import, full price/labs/meds catalogs,
  clinical record, RLS POC).
- **May 24:** a clean **`portal`** schema was created (`portal_init_schema…`,
  `portal_core_tables`, `portal_rls_helpers_and_policies`, `portal_seed_clinics`,
  `portal_admin_bootstrap`) and **`wipe_public_schema_keep_portal`** ran, then
  `expose_portal_schema_to_postgrest`. **The `hmc-portal` app was built on this
  `portal` schema.**
- **May 28 (today):** the P3A/P3B **`public.portal_*`** model (`001`–`014`,
  incl. legacy import `012`) was applied to `public`.

Result: `portal` (7 tables) and `public.portal_*` (33 tables + 1 view) coexist
in the same project.

## 3. Data census (aggregate; legacy PHI confirmed = 0)

| `portal` (app) | rows | `public.portal_*` (P3A/P3B) | rows |
|---|---|---|---|
| clinics | 8 | billing_facilities / locations / rooms | 2 / 9 / 30 |
| profiles | 6 (1 admin active, 5 nurse inactive) | user_profiles / staff / scopes | 5 / 8 / 4+8 |
| insurance_companies | 0 | treasury_accounts | 40 |
| **cases** | **0** | **patients / cases** | **1 / 1 (010 test seed)** |
| payments / case_files | 0 / 0 | encounters/intakes/billing/treasury/attendance | 0 |
| admin_bootstrap | 2 | **legacy_import_batches/staging/exceptions/status_history** | **0 / 0 / 0 / 0** |

- **Legacy imported PHI = 0** across all four legacy tables (my P3B dry-runs
  inserted nothing — confirmed).
- **No real patient operational data in either model** (`portal.cases=0`;
  `public.portal_cases=1` documented test seed). `portal` holds real *config*
  only: clinics + one active admin (5 nurse profiles inactive).

## 4. Side-by-side comparison

| Dimension | `portal` schema (app today) | `public.portal_*` (P3A/P3B) |
|---|---|---|
| **Auth** | Supabase Auth; `profiles.user_id→auth.users`; **auto-provision trigger** `tg_on_auth_user_created`; `admin_bootstrap`(2); helpers `is_admin/is_active_user/current_role/current_clinic_id` (all DEFINER) | Supabase Auth; `portal_user_profiles→auth.users`; helpers `portal_is_admin/_is_active_user/_has_location/_can_access_case/_current_role`; **no signup auto-provision trigger** (profiles seeded) |
| **Roles** | `user_role`: nurse, branch_staff, admin (3) | `portal_role`: admin, clinic_user, reception_user +owner/insurance_staff/treasury/nurse/doctor/viewer_auditor (9); +staff/assignment roles |
| **Clinics / branches** | `clinics`(8): HMC main×2, SMC×1, External×5 | `portal_locations`(9) + `portal_billing_facilities`(HMC/SMC) + `rooms`(30) |
| **Case model** | **Flat** `cases` (inline `patient_name`); 7-state `case_status` clinic+transfer workflow | **Normalized** patients + cases + encounters + travel + transfers + room_assignments; financial_type/route/encounter_pattern/treatment_mode |
| **Insurance workflow** | Inline on case (insurer/ref/our_ref/currency/SC/excess); **no status timeline** | intakes + **admin-only** billing_preparations + **`insurance_case_status_history`** (13-state GOP→Paid) + assistance companies |
| **Treasury** | `payments` only | Full ledger: accounts(40)+movements+collections+expenses+handovers+visa/cash; secure FX functions |
| **Attendance** | none | nurse_shifts + doctor_daily_duty (+ secure fns) |
| **Legacy import** | **none** | **Complete (012):** batches/staging/exceptions/status-history + legacy cols; `matched_existing_case_id`; the validated Python pipeline targets it |
| **Audit / status history** | none | append-only `portal_audit_log` + `portal_audit()` + status history |
| **RLS maturity** | 17 policies / 7 tables; all RLS on; simple | 69 policies / 33 tables; all RLS on; location-scoped, admin-only billing/legacy, immutable audit/treasury |
| **Migration / adoption risk** | Keep as-is → must **build** insurance-timeline, treasury, attendance, legacy import, audit, richer roles from scratch (discards P3A/P3B) | Adopt → **frontend refactor** (schema + roles + queries + types) but **near-zero data to migrate** (0 real cases; 8 clinics + 1 admin to re-seed) |

## 5. Security advisor (hmc-medical, security)

- **0 ERROR-level**; RLS is enabled on **every** table in both schemas.
- **12 × WARN** "Signed-In Users Can Execute SECURITY DEFINER Function" — all on
  `public.portal_*` helper/business fns exposed as REST RPC (e.g.
  `portal_is_admin`, `portal_can_access_case`, `portal_has_location`,
  `portal_record_collection/expense`, `portal_create_case_with_ref`). These are
  internal policy helpers; remediation = revoke `EXECUTE` from `authenticated`
  (or `SECURITY INVOKER` where safe). Hardening, **not a blocker**.
- **1 × WARN** Leaked-password protection disabled (Auth) → enable HIBP check.

## 6. Option evaluation (no implementation)

**Option A — keep the Next.js `hmc-portal` frontend; repoint/refactor onto
`public.portal_*`.** *(owner's preference)*
- Pros: adopts the **feature-complete, security-tested** backend that already has
  the insurance status timeline, treasury, attendance, audit, and the legacy
  import module the Excel feature needs; preserves the real authenticated
  frontend + its UX; one canonical source of truth.
- Cons / work: frontend data-layer refactor (schema `portal→public`, 3→richer
  roles, flat→normalized case/patient/intake queries, regenerate types);
  must add a **signup→`portal_user_profiles` auto-provision + admin bootstrap**
  in `public` (today only the `portal` schema has that trigger); remediate the
  12 SECURITY DEFINER advisor warnings.
- Risk: **data migration LOW** (0 real cases; re-seed 8 clinics + re-establish 1
  admin against the same `auth.users`); frontend effort **MEDIUM-HIGH**.

**Option B — adopt `portal` as canonical (with a deprecation plan for
`public.portal_*`).**
- Pros: smallest immediate frontend change; simpler model nurses already use.
- Cons: must **re-build** insurance follow-up (GOP/Waiting Final GOP/Paid),
  treasury, attendance, audit, location scoping, legacy import — i.e. re-derive
  and re-secure everything P3A/P3B already delivered. Discards tested work and
  the legacy pipeline. Justified only if the rich model were overkill — but your
  roadmap (legacy insurance follow-up, treasury, attendance, transfers) **needs
  it**.
- Risk: high rebuild + re-audit cost.

**Option C — two parallel production backends.** Reject. This is the current
*accidental* state, not a target. Acceptable only as **temporary demo isolation**
until one model is chosen.

## 7. Recommendation — Option A

Make **`hmc-portal` (the authenticated Next.js frontend) the one real Portal**,
refactored onto the **`public.portal_*`** backend as the single source of truth.

- **What happens to `portal` schema:** deprecate it. It carries no operational
  case data — only 8 clinic rows + 1 active admin + 5 inactive nurse profiles to
  re-establish in `public`. Keep it read-only/parked until cutover is verified,
  then retire (a `wipe_portal_schema` mirror of the earlier wipe, owner-approved).
- **Where the Admin Excel Import lands:** `public.portal_legacy_*` (batches /
  staging / exceptions / status-history) → promote into `public.portal_cases`
  (admin-only legacy), exactly as 012 + the validated Python pipeline already
  define. No new schema fork needed; the P3C plan's "port 012 into `portal`"
  step is **dropped** in favour of using `public.portal_*` directly.
- **Why no concrete blocker:** same `auth.users` (logins survive); negligible
  data to migrate; the only real gaps (auth auto-provision + admin bootstrap in
  `public`, advisor hardening) are bounded workstreams, not blockers.

**Proposed Option-A workstreams (for a later, separately-approved sprint — NOT
started now):**
1. `public` auth provisioning: signup→`portal_user_profiles` trigger + admin
   bootstrap + role mapping (nurse/branch_staff/admin → portal_role set).
2. Frontend data-layer refactor: `createClient` schema → `public` (or move the
   `portal_*` tables/types), rewrite admin/cases/dashboard queries to the
   normalized model, regenerate `types.ts`.
3. Re-seed clinics/locations + facilities mapping; verify RLS + security
   verification SQL; remediate the 12 SECURITY DEFINER warnings + enable HIBP.
4. Then resume P3C (Admin Excel Import) against `public.portal_legacy_*`.
5. Cutover + verify → retire `portal` schema (owner-approved).

## 8. Status

- **No schema target approved** — this report recommends Option A and **stops for
  Mohamed's decision**.
- Restrictions held: read-only only; no migrations/code/PHI; `hmc-v2` &
  `PS Shop` untouched; no deploy; Master Sheet / Invoice Manager / PDF engines /
  OneDrive / public demo untouched.
