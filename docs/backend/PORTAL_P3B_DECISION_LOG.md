# PORTAL P3B — Decision Log

## P3B.1 — Backend target (confirmed)
- **Approved Portal backend:** `hmc-medical` (Supabase ref `zlgxalmaiwatnoydgkxo`),
  `public` schema, `portal_` prefix. Confirmed by Mohamed in P3A.
- **`hmc-v2` (`gynsbdiofcizwbymzppq`) is OFF-LIMITS** — it holds real-looking
  prior data (72 staff, patients w/ passport/national-ID). Not touched in P3A
  or P3B.
- **PS Shop** (`iiiacdhlgixkwzykthrl`) inactive — not used.

## P3B addendum scope (approved)
- Approved: controlled import of **historical insurance case records from the
  approved Master Sheet only**, Admin-only visibility.
- NOT approved: real staff, attendance, treasury movements, payments (beyond
  case status/amount already in the sheet), attachments, OneDrive files,
  Master Sheet modification, Claude invoice connection, public frontend deploy,
  clinic/reception visibility of legacy cases.

## Master Sheet source (read-only)
- File: `C:\Users\moham\OneDrive\2025\Work\Master Sheet New.xlsm`
- SHA-256 (pre-import, read-only): `C66C9699590C884B930D408E308D06AECD01D60CCB9F99BF6B693B6F63E22B52`
- Size: 1,657,448 bytes
- Import tab: **`Master Sheet`** (canonical). `Master Sheet Backup` excluded
  (duplicate). `2026 G-Sheet` (739 rows, richer 2026-only columns) noted as a
  possible alternate/supplemental source — NOT imported unless Mohamed asks.

## PHI-handling constraint affecting the import mechanism
The Supabase MCP tools execute SQL passed as text, which would route real
patient data (names, DOBs, insurance refs) through the assistant session — a
PHI exposure. Therefore the bulk PHI insert will be performed by a **local
Python import script connecting directly to Postgres** (PHI goes file → DB,
never through the assistant). That script needs a secure DB credential
(service-role key or DB connection string) supplied by Mohamed at run time and
**never committed**. Schema/DDL (no PHI) is applied via MCP; only the row data
import uses the local-credential path.

## P3B progress (checkpoint)
- **P3B.1 / .2 / .3 complete.** Read-only inspection + masked mapping doc;
  legacy schema applied to hmc-medical (migrations `012`, `013`).
- **Approved import routing:** import ALL non-duplicate insurance rows into
  final legacy cases (admin-only); no-OUR-Ref rows import with `our_ref = NULL`
  ("Not Previously Assigned") — never invent a ref; include already-Paid; only
  the duplicate-OUR-Ref pair (+ any row missing patient identity) → Exceptions/
  Review; soft issues (missing insurer/currency/DOB) imported with NULLs and
  flagged. Only unpaid/open count in active follow-up KPIs.
- **Dry-run (validated, PHI-free):** `3,196 = 3,194 promote + 2 exceptions`.
  Soft flags: 2,739 no-ref · 11 missing insurer · 1 bad currency · 39 missing
  DOB. (013 made DOB/gender nullable for legacy.)
- **Import script:** `_p3b_legacy_import/import_master_sheet_legacy.py` (outside
  repo; PHI-free; dry-run default; `--commit`; `--rollback <batch>`; re-verifies
  the Master Sheet SHA-256; aggregate-only output; psycopg/psycopg2 compatible).
- **PENDING credential:** `--commit` needs `PORTAL_DB_URL` (hmc-medical Postgres
  connection string) so PHI goes file→DB directly. Then **P3B.5** (Admin Legacy
  Insurance Cases page + local Supabase wiring, needs the anon key) + verify.

## P3B.4 — first run failed (workbook locked) + integrity finding
- **First import attempt FAILED at hash verification** (`PermissionError` — the
  workbook was open in Excel / OneDrive syncing). **Nothing inserted** (verified:
  0 across all legacy tables). Runner had a false "Done" message bug.
- **Runner/script hardened:** any failure now exits non-zero + prints
  `IMPORT FAILED - NOTHING INSERTED`, writes no summary, imports from a verified
  read-only local copy, single-transaction rollback (no partial batch),
  ASCII-only PS for PS 5.1, UTF-8-safe Python output.
- **Workbook re-saved by Excel** → whole-file hash changed `C66C9699…` →
  `ED13D716…`. Integrity comparison (PHI-free) proved the **case data is
  unchanged**: all 12 scalar fingerprints, 4 value→count maps, and 7
  classification numbers identical to the approved original.
- **New stable anchors:** whole-file `ED13D716…DC0E968`; **content hash
  `F9D9C26D…2116DF`** (metadata-invariant). Added a content-hash integrity
  layer so benign Excel re-saves no longer block, while real data changes still
  abort. Re-baseline approved by Mohamed; anchors set in the script.

## P3B.4 — second run failed: REAL source data change detected
- Live `-Commit` aborted at integrity check; **nothing inserted** (DB re-verified
  0 across all legacy tables).
- Diagnosis (PHI-free): **not** a stale/wrong copy — the runner rebuilt a fresh
  copy from the correct path. The **source workbook genuinely changed**: full
  distribution comparison found `currency EUR 14 -> 15` (a real cell edit), and
  the file kept being re-saved (LastWrite 14:17 -> 16:29 -> 17:54). The
  content-hash gate worked as designed and refused the changed file. Current
  hashes: whole `9F85D9FC…`, content `32FF6A6C…`. **Not re-baselined.**
- **Root cause:** the Master Sheet is a LIVE working file being actively edited.
  Importing from a moving target will keep (correctly) failing the gate.
- **Runner hardened (P3B.4 safeguards):** unique per-run temp copy (never reuse),
  legacy fixed-name copy auto-deleted, two-copy STABILITY check (aborts if the
  source changes mid-read), guaranteed deletion of the PHI temp copy, and the
  Python resolver no longer falls back to any persistent local copy.
- **Path forward (awaiting Mohamed):** freeze a dedicated import SNAPSHOT of the
  Master Sheet (a copy he will not edit), approve baselining to it, then import
  from the frozen snapshot — decoupling the import from live editing.

## P3B.4 — Option A executed: frozen import snapshot (2026-05-28)
- **Decision (Mohamed):** Option A — import from a frozen snapshot of the current
  latest Master Sheet version (incl. the real `currency EUR 14 -> 15` edit),
  treated as the latest source state for this legacy import batch. Do not read the
  moving OneDrive workbook again during this batch.
- **Snapshot minted (read-only, private, never committed):**
  `_p3b_legacy_import/_private_snapshot/Master Sheet New - PORTAL LEGACY IMPORT SNAPSHOT - 2026-05-28.xlsm`
  (1,657,699 bytes). Created via a two-copy stability gate (both copies' SHA-256
  identical → source stable at the 17:54 save). A `.gitignore` in the import area
  excludes the snapshot, temp copies, and the summary as defense-in-depth (the
  tree is currently outside any git repo).
- **New approved anchors (re-baselined from the snapshot):** whole-file
  `9F85D9FC...E5234854`; content (metadata-invariant) `32FF6A6C...F17F6A6D`.
  These supersede the prior `ED13D716.../F9D9C26D...` live-file anchors. The EUR
  14→15 edit changes no classification count (both `Euro` and `EUR` → EUR).
- **Wiring:** `import_master_sheet_legacy.py` (`PATH`, `EXPECTED_SHA256`,
  `EXPECTED_CONTENT_SHA256`) and `RUN_LEGACY_IMPORT_SECURE.ps1` (`$Src`) now point
  at the frozen snapshot. All P3B.4 runner safeguards preserved (fresh unique
  per-run temp copy, two-copy stability check, guaranteed PHI-temp deletion,
  no silent reuse, fail-safe `IMPORT FAILED - NOTHING INSERTED`, no creds/PHI in
  output).
- **Snapshot dry-run (validated via the hardened runner, PHI-free, exit 0):**
  integrity OK (file-identical) → `3,196 = 3,194 promote + 2 exceptions`. Soft
  flags: 2,739 not-previously-assigned · 11 missing insurer · 1 bad currency ·
  39 missing DOB. 0 DB inserts (no summary file written; temp copy auto-deleted).
- **Status:** awaiting Mohamed to run `-Commit` himself (needs the hmc-medical
  Postgres connection string at the hidden prompt; `PORTAL_ADMIN_USER_ID` is
  preset in the runner). Nothing inserted yet.

## P3B.5 — Live import DEFERRED; pivot to Admin Excel Import feature (2026-05-28)
- **Owner decision (supersedes the pending `-Commit`):** do NOT run the live
  legacy import now. Mohamed continues editing the active Master Sheet until end
  of May 2026 (statuses + case details still changing during normal operations);
  importing from a moving source now would create reconciliation churn.
- **Deferred go-live source:** a frozen closing snapshot Mohamed will produce
  himself after he finishes the month, e.g.
  `Master Sheet New - Closing Snapshot 31-05-2026.xlsm`. That file — not the
  2026-05-28 snapshot, not the live OneDrive workbook — becomes the approved
  source for the FIRST real Legacy Insurance Cases batch.
- **Preserved (not discarded):** all P3A/P3B schema, RLS, validation, the
  hardened secure runner, file-hash + content-hash gates, and the import
  classification logic remain as assets to reuse. The 2026-05-28 frozen snapshot
  + its anchors stay on disk but are NOT the go-live source.
- **Database state:** hmc-medical stays FREE of real legacy PHI until the closing
  snapshot is supplied and approved. No re-baseline against the live workbook.
- **Next task (approved):** build an Admin-only, local-only **"Import Legacy
  Insurance Cases"** workflow in the Portal (upload a frozen `.xlsm` → read the
  insurance worksheet only → validate + hash + PHI-safe preview → explicit
  confirm → batched insert + audit + rollback; designed for later re-import of a
  newer snapshot with reconciliation, not blind overwrite). **Built and tested
  with SYNTHETIC data only** until the 31-05 closing snapshot. Scope for now =
  Master Sheet insurance source only (NOT the 2026 daily cash/transfer sheet —
  that is a separate future workflow). Full plan:
  `PORTAL_P3C_ADMIN_LEGACY_IMPORT_PLAN.md`.
- **Open Decision 0 (blocks build, owner input needed):** the running `hmc-portal`
  app targets a `portal` schema with UNPREFIXED tables (`cases` with inline
  `patient_name`, clinic-workflow `status` enum; no batch/staging/status-history
  tables, no migrations in-repo). The versioned P3A/P3B migrations (incl. legacy
  `012`) target a different `public.portal_*` model. The legacy import must land
  in the schema the app actually uses — see plan §2 for the recommended path
  (port the 012 legacy module into the app's `portal` schema as a new versioned
  migration set).
- **Restrictions reaffirmed:** synthetic data only until approval; no public
  GitHub Pages deploy of a Supabase-connected import; no service-role/keys in
  frontend; admin-auth + verified RLS for the real import; `hmc-v2` untouched;
  Invoice Manager / PDF engines / OneDrive folders / public demo untouched;
  Master Sheet read-only, no sync-back.

## P3C.0 — Backend / Schema Alignment Decision Sprint (read-only, 2026-05-28)
- **State: PENDING ARCHITECTURE DECISION.** No schema target approved; P3C build
  (Admin Excel Import) is on hold until Mohamed picks the canonical backend.
- **Audit done (read-only, `zlgxalmaiwatnoydgkxo` only; `hmc-v2`/`PS Shop`
  untouched; aggregate/catalog SQL, no PHI).** Full report:
  `PORTAL_P3C0_SCHEMA_ALIGNMENT_REPORT.md`.
- **Key facts:**
  - `hmc-portal` is **local-only (not deployed)** and points at **hmc-medical**
    (`zlgxalmaiwatnoydgkxo`) schema **`portal`**.
  - hmc-medical hosts **BOTH** models: `portal` (7 tables, app's live backend)
    and `public.portal_*` (33 tables + 1 view, the P3A/P3B model). Migration
    timeline: big `public` build (Apr–May17) → `portal` created +
    `wipe_public_schema_keep_portal` (May24, app built here) → P3A/P3B `001–014`
    re-applied to `public` (May28).
  - **Legacy PHI = 0** (all four legacy tables empty). **No real patient data in
    either model** (`portal.cases=0`; `public.portal_cases=1` test seed). `portal`
    has real config only (8 clinics, 1 active admin, 5 inactive nurses).
  - RLS enabled on every table (portal 17 policies/7 tbl; public 69/33). Security
    advisor: **0 errors**; 12 WARN (SECURITY DEFINER fns executable via RPC, all
    `public.portal_*`) + 1 WARN (leaked-password protection off) → hardening, not
    blockers.
- **Recommendation: Option A** — make the authenticated `hmc-portal` frontend the
  one Portal, refactored onto **`public.portal_*`** (feature-complete +
  security-tested + already has the legacy-import module). Deprecate the `portal`
  schema after cutover (near-zero data to migrate; same `auth.users`). The Admin
  Excel Import then targets `public.portal_legacy_*` directly — the P3C plan's
  "port 012 into the `portal` schema" step is **dropped**. No concrete blocker
  found; bounded workstreams only (auth auto-provision + admin bootstrap in
  `public`, frontend data-layer refactor, advisor hardening).
- **Next:** await Mohamed's approval of the canonical architecture before any
  migration/code. Nothing implemented.

## P3C.0 — DECISION: Option A is the OWNER-APPROVED canonical architecture (2026-05-28)
- **Status: APPROVED by Mohamed.** Supersedes the "PENDING ARCHITECTURE
  DECISION" state above. Option A is now the canonical direction; Option B and
  Option C (the accidental two-backend state) are rejected.
- **Canonical frontend:** the authenticated Next.js app **`hmc-portal`** becomes
  the one real operational Portal frontend.
- **Canonical backend / single source of truth:** the security-tested
  **`public.portal_*`** model in the approved project **`hmc-medical`**
  (ref `zlgxalmaiwatnoydgkxo`). Confirmed live this date: 33 `public.portal_*`
  tables + 1 view, RLS on every table, migrations `001`–`014`.
- **Approved consequences:**
  1. Do **not** port/duplicate the legacy import module (012) into the simpler
     `portal` schema — the P3C plan's "port 012 into `portal`" step is formally
     dropped.
  2. Do **not** merge legacy insurance cases into the simplified operational
     `portal.cases` model.
  3. The current `portal` schema (7 tables) is now **non-canonical** — treated as
     a temporary earlier app model. It may be deprecated later, only after any
     required config is safely migrated/re-seeded into `public.portal_*`.
  4. The future Admin Excel Import reads/writes the existing
     `public.portal_legacy_*` / `public.portal_*` model created in P3A/P3B.
- **Why approved (read-only audit basis — `PORTAL_P3C0_SCHEMA_ALIGNMENT_REPORT.md`):**
  both schemas live in the same approved project; `hmc-portal` is local-only and
  safely adaptable pre-production; `public.portal_*` is materially more complete
  (insurance workflow, legacy import, treasury, attendance, audit, roles, RLS);
  **legacy PHI = 0**; neither backend holds real operational patient cases
  (`portal.cases`=0; `public.portal_cases`=1 is the migration-010 synthetic seed)
  → no risky migration required.
- **Live verification this date (read-only; catalog/aggregate only, no PHI):**
  legacy tables (`portal_legacy_import_batches/_case_staging/_import_exceptions`,
  `portal_insurance_case_status_history`) all 0 rows; security advisor = **0
  ERROR**, **12 WARN** SECURITY DEFINER (the intentional authenticated-executable
  set) + **1 WARN** leaked-password protection off.
- **Next:** P3C.1 — Canonical Backend Cutover & Admin Import implementation plan
  (plan/documentation only; no migrations, no frontend code, no PHI). See
  `PORTAL_P3C1_CUTOVER_AND_IMPORT_PLAN.md`.

## P3C.1 — ACCEPTED directionally; implementation GATED on P3C.2 proposal (2026-05-29)
- **Status:** Mohamed accepts the P3C.1 plan **in principle** (Option A stands:
  `hmc-portal` becomes the real frontend; canonical backend remains the existing
  `public.portal_*` model in `hmc-medical` / `zlgxalmaiwatnoydgkxo`).
- **But no broad cutover and no Excel Import yet.** The first executable work is a
  narrow, reviewable **foundation sprint** only: (1) let `hmc-portal` recognize an
  authenticated admin through `public.portal_*`; (2) establish the canonical
  profile/role/location mapping RLS needs; (3) synthetic/test-only data to verify
  login + admin access + clinic restriction; (4) a single safe **read-only**
  Admin/Dashboard cutover slice before any create/update workflow. **Excel
  upload/import is explicitly out of the first sprint.**
- **Implementation is gated behind written approval of the P3C.2 proposal**
  (`PORTAL_P3C2_AUTH_BRIDGE_AND_SYNTHETIC_FOUNDATION_PROPOSAL.md`). Proposal step
  is documentation-only; no migrations, no frontend code, no PHI until approved.
- **Exact canonical object names confirmed live this date (read-only catalog) —
  use these verbatim, they supersede any loose `portal_*` shorthand in earlier
  prose:**
  - Profile/identity: **`public.portal_user_profiles`** (PK `user_id` →
    `auth.users.id`; cols `display_name`, `role public.portal_role`, `active`,
    `linked_staff_id` → `public.portal_staff`).
  - Role enum: **`public.portal_role`** = admin, clinic_user, reception_user,
    owner, insurance_staff, treasury, nurse, doctor, viewer_auditor.
  - User→location (RLS scoping): **`public.portal_user_location_scopes`**
    (`user_id`, `location_id`, `active`).
  - Locations: **`public.portal_locations`** (9 rows); facilities:
    **`public.portal_billing_facilities`** (2). Operational staff master:
    **`public.portal_staff`** (8) + **`public.portal_staff_location_assignments`**
    (8) — distinct from auth identity.
  - Cases: **`public.portal_cases`**; patients: **`public.portal_patients`**.
  - Legacy import: **`public.portal_legacy_import_batches`**,
    **`public.portal_legacy_case_staging`**,
    **`public.portal_legacy_import_exceptions`**,
    **`public.portal_insurance_case_status_history`**.
  - RLS helper fns (required by policies): `portal_is_admin()`,
    `portal_is_active_user()`, `portal_current_role()`,
    `portal_has_location(uuid)`, `portal_can_access_case(uuid)`.
- **Two findings that shape P3C.2 (live-verified, read-only):**
  1. The only `auth.users` signup trigger, **`tg_on_auth_user_created`, lives in
     the non-canonical `portal` schema** and writes `portal.profiles` — NOT
     `public.portal_user_profiles`. The canonical model has **no** auto-provision;
     the real admin (Mohamed) currently has no `public.portal_user_profiles` row.
  2. The 5 rows in `public.portal_user_profiles` are **all synthetic**
     (`@portal.test`): 1 admin + 2 clinic_user + 2 reception_user, scoped to
     `al_kawther / romance / sheraton / tropitel` — a ready RLS test fixture. The
     1 `public.portal_cases` row is the migration-010 synthetic seed
     (case `e0000000-…0001`, patient `d0000000-…0001`,
     `source_type=portal_registration`). To be excluded from KPIs; not deleted.

## P3C.2 — GATE 2: canonical admin bridge (2026-05-29)
- **Approval:** Mohamed approved P3C.2 for **Gate 2 only** (canonical admin
  bridge + DB/RLS verification). Frontend read-only slice remains gated (Gate 4,
  separate approval). Correction applied: **no persisted synthetic legacy row** —
  legacy visibility is proven by an insert-then-`ROLLBACK` inside a single
  transaction, leaving the legacy tables at 0 rows.
- **Migration file:** `supabase/migrations/015_portal_canonical_admin_bridge.sql`
  (saved with header + ROLLBACK section before execution).
- **Affected objects:** WRITE `public.portal_user_profiles` (UPSERT, 1 row);
  READ-ONLY `portal.profiles` (admin id resolution), `public.portal_role` enum,
  `auth.users` (FK target, not written).
- **Expected result:** public admin profiles 1 (synthetic) → 2 (synthetic + 1
  real); `portal_user_profiles` total 5 → 6. No other table changes.
- **Additive / non-destructive:** yes. The real admin id + display name are
  resolved **in-database** from `portal.profiles` (no UID/email/name literal in
  the file or any output). Does NOT modify the non-canonical `portal` schema,
  the legacy import tables, the migration-010 synthetic seed, the public demo,
  the Master Sheet, or any operational/PHI data. No signup auto-provision
  trigger. No location scope added (admins bypass via `portal_is_admin()`). No
  change to any SECURITY DEFINER function or EXECUTE grant.
- **Rollback:** `delete from public.portal_user_profiles where user_id in
  (select id from portal.profiles where role::text='admin' and is_active=true);`
  (targets only the bridged real admin; the synthetic `a0000000-…` admin is not
  in `portal.profiles`, so it is never affected).
- **SECURITY DEFINER posture (verification, no changes this gate):** the 5 RLS
  helpers (`portal_is_admin`, `portal_is_active_user`, `portal_current_role`,
  `portal_has_location`, `portal_can_access_case`) are all `STABLE SECURITY
  DEFINER`, `search_path=public,pg_temp` locked, and key strictly off
  `auth.uid()` (caller's own profile/scope — no parameter permits impersonating
  another user). `authenticated` EXECUTE retained (required by policies). The 7
  business write RPCs left untouched. Leaked-password protection unchanged
  (separate Auth recommendation).
- **EXECUTED 2026-05-29 (`apply_migration` → success).** Aggregate result, no PII:
  `public.portal_user_profiles` 5 → 6; admin profiles 1 → 2 (both active);
  unbridged active admins remaining = 0. No other table changed.
- **RLS proof (insert synthetic legacy rows → impersonate via `SET ROLE` + JWT
  claims → `ROLLBACK`):** visible-row counts on
  `portal_legacy_import_batches` / `portal_legacy_case_staging` /
  `portal_legacy_import_exceptions`:
  - real canonical admin → **1 / 1 / 1** (can read protected legacy tables);
  - synthetic clinic_user → **0 / 0 / 0** (RLS denies);
  - authenticated, no canonical profile → **0 / 0 / 0** (RLS denies);
  - anonymous → no `SELECT` privilege on the 3 legacy tables
    (`has_table_privilege`=false) + 0 anon-targeted policies → denied at grant
    level (not queried, to avoid a privilege error).
  - **After `ROLLBACK`:** legacy tables all 0; no `f0000000-…` synthetic row
    remains. Complete rollback verified.
- **Migration-010 synthetic seed unchanged & reported separately:** case
  `e0000000-…0001` + patient `d0000000-…0001` present (`portal_cases` total = 1;
  `admin_only_legacy_case` rows = 0). It is a `portal_registration` seed, NOT a
  legacy import row; all four legacy import/status tables remain **0 real
  imported rows**.
- **`portal` schema not modified** (read-only id resolution only). **No frontend
  code changed; nothing deployed.** No SECURITY DEFINER function / grant changed;
  leaked-password protection unchanged (separate Auth recommendation).
- **STOP — Gate 2 complete. Awaiting Mohamed's review before the Gate 4 read-only
  frontend slice.**

## P3C.3 — Local read-only canonical Admin slice (2026-05-29)
- **Approval:** Mohamed approved P3C.3 (the "Gate 4" read-only slice): the
  smallest LOCAL, read-only Admin **Legacy Insurance Cases** page in `hmc-portal`
  proving the authenticated Next.js frontend can read the canonical
  `public.portal_*` backend via the real admin session + existing RLS. Excel
  import + any status/write actions remain prohibited.
- **Gate 2 follow-up resolved:** migration `015` header rollback note improved —
  preferred per-uid rollback form + explicit warning that the broad
  `portal.profiles` form is valid only while one admin is bridged + future
  provenance-marker suggestion.
- **Stack note:** `hmc-portal` is **Next.js 16.2.6 / React 19**; middleware is
  `proxy.ts` (Next 16 rename). Server components: `await cookies()`,
  `export const dynamic = "force-dynamic"` — mirrors existing working pages.
- **Approach — purely additive: NEW files only, ZERO edits to existing files,
  pages, or the portal-schema clients.** Existing operational pages keep using
  the `portal` schema unchanged.
- **Files to ADD (4):**
  - `lib/supabase/types.public.ts` — minimal hand-written types for the canonical
    `public.portal_*` objects this page reads.
  - `lib/supabase/canonical.ts` — `createCanonicalClient()`: `public`-schema
    `@supabase/ssr` server client using the **user's JWT** (anon key + cookies).
    **No service-role key; RLS applies.**
  - `lib/auth-canonical.ts` — `requireCanonicalAdmin()`: self-reads
    `public.portal_user_profiles` (RLS `portal_user_profiles_sel`) and requires
    `role='admin' AND active`; redirects `/login` (no session) or `/dashboard`
    (not a canonical admin).
  - `app/admin/legacy/page.tsx` — read-only **Legacy Insurance Cases** empty-state
    dashboard (title / deferred-import banner / KPI cards / disabled actions /
    admin-only technical status). Counts via `head:true` count queries on the 4
    canonical legacy tables + `portal_cases` where `admin_only_legacy_case=true`.
- **Data-access rules honoured:** canonical `public` schema only; user JWT + RLS;
  no service-role in browser; no RLS bypass; **no silent `portal`-schema
  fallback**. Existing pages still use the `portal` client (unchanged).
- **Security layering for `/admin/legacy`:** `proxy.ts` gates `/admin/*` by the
  portal-schema admin role (existing) + new `requireCanonicalAdmin()` canonical
  check + **database RLS = the real protection layer**.
- **Revertibility:** delete the 4 new files (and the empty `app/admin/legacy/`
  dir). No existing file touched → clean `git` diff. No DB writes. No deploy.
- **IMPLEMENTED + VERIFIED 2026-05-29.** Added 4 files (purely additive, zero
  edits to existing files): `lib/supabase/types.public.ts`,
  `lib/supabase/canonical.ts`, `lib/auth-canonical.ts`,
  `app/admin/legacy/page.tsx`. One additive preview-only entry
  (`hmc-portal-next`, port 3000) added to the repo-root `.claude/launch.json`.
- **Verification (local, read-only, no deploy):**
  - `npx tsc --noEmit` → exit 0 (new files type-check against the project).
  - `npm run build` (Next 16.2.6 Turbopack) → exit 0; route table lists
    **`ƒ /admin/legacy`** as a dynamic server-rendered route → page + canonical
    client + guard compile and wire in cleanly.
  - `next dev` boots clean; anonymous GET `/admin/legacy` → **HTTP redirect to
    `/login?next=%2Fadmin%2Flegacy`** (proxy denial; screenshot captured). No
    compile/runtime errors in server logs.
  - Admin empty-state data = the all-zero canonical counts already DB-proven this
    date (legacy batches/staging/exceptions/status_history = 0;
    `admin_only_legacy_case` = 0).
  - Non-admin / no-canonical-profile / anonymous denial enforced by three layers:
    `proxy.ts` portal-admin gate + `requireCanonicalAdmin()` + database RLS
    (RLS persona matrix proven in the Gate 2 entry above).
  - **Limitation (disclosed):** an in-browser *admin-rendered* screenshot was not
    captured — it requires the real admin's login credentials (not used), and the
    migration-010 synthetic users are passwordless by design. Admin render is
    instead evidenced by the successful build + the DB-layer empty-state proof.
- **No database rows inserted or modified by this slice. No deploy.**
- **Revert:** delete the 4 new files + the empty `app/admin/legacy/` dir; remove
  the additive `hmc-portal-next` entry from `.claude/launch.json`. No existing
  file was modified.
- **STOP — P3C.3 complete. Awaiting Mohamed's review before any Excel Import UI.**

## P3C.4 — Old Cases Admin tab + synthetic CRUD UI (2026-05-29)
- **Direction change (owner):** stop over-engineering a unified Insurance Cases
  architecture. Ship a simple, usable Admin tab **"Old Cases"** for historical
  Master Sheet insurance cases, kept technically **separate** from new
  operational Portal cases for now. Merge/linking deferred until legacy data is
  cleaned + OUR Refs completed. Invoice Manager integration = future only. Goal:
  Mohamed stops working from Excel after the final import and follows old cases
  inside the Portal.
- **Built — synthetic data only; NO database writes (real legacy tables stay 0):**
  - Sidebar: "Old Cases" admin-only nav item (`components/AppShell.tsx`).
  - `lib/oldCases/{types,fixtures,store,actions}.ts` — flat `OldCase` view-model
    (7 insurance statuses: Pending/GOP/Waiting Final GOP/Submitted/Paid/Closed/
    Needs Review), ~15 synthetic sample cases, an in-memory `globalThis` store,
    and admin-guarded server actions (status / notes / OUR-Ref / archive /
    delete) that mutate ONLY the in-memory store.
  - `app/admin/old-cases/page.tsx` + `OldCasesFilters.tsx` — dense Excel-like
    table + filters: name search, DOB, insurer, facility, status, OUR-Ref
    (Has / Not Previously Assigned), Paid/Open/Needs-Review, show-archived,
    clear. Columns: OUR Ref, Patient, DOB, Insurer, Ins. Ref, Facility, Currency,
    Status, Notes, Updated, Source (`Legacy Import`).
  - `app/admin/old-cases/[id]/page.tsx` + `OldCaseDetail.tsx` — detail view +
    edit (status w/ reason, notes, assign/fill OUR Ref), Archive/Restore,
    synthetic permanent-Delete (with confirm), status-history + audit-history
    timelines.
  - `app/admin/old-cases/badges.tsx` — `StatusChip` + `Legacy Import`
    `SourceBadge`.
  - Removed the technical `app/admin/legacy` proof page (replaced). Daily UI
    carries no DB table names / RLS / canonical-status / debug wording.
  - Guard: `requireCanonicalAdmin()` (reuses the P3C.2/P3C.3 canonical client).
- **Performance finding:** the ~4 s dev lag + repeated "Rendering…" is
  **development-mode behavior** — Turbopack on-demand compilation + every page
  using `export const dynamic = "force-dynamic"` + the proxy doing a per-request
  `getUser()` + profile lookup. Mitigation = production preview: `next build`
  → exit 0; `next start` → **Ready in ~155 ms**, no per-request recompile.
- **Verification (local, no deploy):** `next build` exit 0 — routes
  **`ƒ /admin/old-cases`** + **`ƒ /admin/old-cases/[id]`** compile; production
  server runs; anonymous `/admin/old-cases` → `/login?next=%2Fadmin%2Fold-cases`
  (proxy gate). Authed admin render to be confirmed by Mohamed — the assistant
  has no admin credentials and the migration-010 synthetic users are passwordless.
- **Restrictions honored:** no real Master Sheet import, no real PHI, no public
  deploy, no old/new merge, no Invoice Manager, no Excel upload, `portal` schema
  untouched; `hmc-v2` / PDF engines / Invoice Manager / OneDrive / public demo /
  active Master Sheet untouched.
- **Run it:** production preview — `npm run build --prefix hmc-portal` then
  `npm run start --prefix hmc-portal`; open `http://localhost:3000/admin/old-cases`
  after admin login.
- **STOP — awaiting Mohamed's review before Excel Upload / real import.**

## P3C.4 — CORRECTION: Old Cases was built in the WRONG app; redone in the Aegis Portal (2026-05-29)
- **Mistake:** the first P3C.4 pass added Old Cases to **`hmc-portal`** (the Next.js
  "Insurance case manager", :3000) — NOT the approved operational UI. Mohamed
  caught it on opening localhost:3000 (wrong login screen).
- **Correct app = the Aegis Portal:** **`D:\Claude Code Engine\hmc-smc-portal-ui-demo`**
  — Vite + React Router, *mock data only, no backend* (:5173). Already contains the
  operational modules (Dashboard, New Case, Cases Master, Collections & Treasury,
  Attendance, Transfers, Reception/room board, Users & Staff, Control Center,
  Invoice Manager placeholder).
- **Owner decisions:** (1) **evolve** the existing **"Legacy Review"** admin tab
  into **"Old Cases"** (reuse the same sidebar slot + route); (2) **leave** the
  mistaken `hmc-portal` code isolated — not reverted, not deployed, not connected.
- **Built in the Aegis Portal (mock only; no backend writes):**
  - `src/data/oldCases.js` — 15 synthetic old cases + 7 statuses
    (Pending/GOP/Waiting Final GOP/Submitted/Paid/Closed/Needs Review) + tone map
    + `payStateOf` helper.
  - `src/pages/preview/PremiumAdminLegacyReview.jsx` — rewritten into the Old Cases
    module: hero, KPIs, Excel-like table (OUR Ref/Patient/DOB/Insurer/Ins Ref/
    Facility/Currency/Status/Notes/Updated/Source), filters (name, DOB, insurer,
    facility, status, OUR-Ref Has/Not-Previously-Assigned, Paid/Open/Needs-Review,
    show-archived, clear), and a slide-over **Drawer** detail/edit (status+reason,
    notes, assign/fill OUR Ref, Archive/Restore, synthetic Delete w/ confirm,
    Status History + Audit History). Edits = local React state + toast only.
  - `src/premium/AdminShell.jsx` — sidebar item relabeled "Legacy Review" →
    **"Old Cases"** (icon `Archive`); route `/design-preview/admin/legacy-review`
    retained.
- **Verified (localhost:5173):** renders in the Aegis design; KPIs correct
  (14 active · 8 follow-up · 4 paid/closed · 2 needs-review · 4 unassigned); table
  + UNASSIGNED pills; detail drawer; **edit verified end-to-end** (Archive→Restore
  toggled the pill + lastUpdated + audit entry, then reverted). No server or
  browser console errors.
- **Restrictions honored:** mock data only; no real Master Sheet import; no PHI;
  no Supabase writes; no public deploy; `portal` schema + canonical backend
  untouched; demo stays disconnected from Supabase.
- **Future note:** the Aegis Portal is mock-only by design. Importing the real
  frozen snapshot later needs a separate backend decision (deferred).
- **STOP — awaiting Mohamed's visual review in the Aegis Portal.**
