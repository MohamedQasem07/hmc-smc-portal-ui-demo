# PORTAL P3C — Admin "Import Legacy Insurance Cases" workflow (PLAN)

**Status:** PLAN ONLY. No code, no schema changes, no real PHI in this phase.
Build + test with **synthetic data only** until Mohamed supplies and approves the
31-05-2026 closing snapshot. Supersedes the pending P3B.4 live `-Commit`
(deferred — see `PORTAL_P3B_DECISION_LOG.md` §P3B.5).

---

## 1. Goal & scope

Give the Admin a self-service Portal feature to import historical **insurance**
cases from a frozen Master Sheet snapshot — replacing the Claude-driven Python
runner path with an authenticated, audited, rollback-able web workflow that the
owner runs himself.

**In scope (now):**
- Import from the **`Master Sheet`** insurance worksheet only.
- Synthetic-data build + test of the full pipeline and UI.

**Out of scope (explicitly deferred):**
- Importing the 2026 daily cash/transfer/operational case sheet → separate future
  workflow.
- Any real-PHI import → gated on the approved `Master Sheet New - Closing
  Snapshot 31-05-2026.xlsm`.
- Touching `hmc-v2`, Invoice Manager, PDF engines, OneDrive folders, the public
  demo, or the live Master Sheet (read-only, no sync-back).

**Reused P3A/P3B assets (do not re-derive):**
- Classification rules + counts (the parity oracle:
  `_p3b_legacy_import/import_master_sheet_legacy.py` → `classify()` / `summarize()`).
- File-hash + content-hash integrity scheme (`whole_file_hash()` / `content_hash()`).
- The 012 legacy data model (batches / staging / exceptions / status history).
- Secure-runner safeguards, translated to server-side equivalents (no PHI in
  output, fail-safe, single transaction, no silent reuse).

---

## 2. Decision 0 — which schema does legacy land in? (BLOCKS BUILD)

There are **two unreconciled data models** in the repo:

| | Running app `hmc-portal` | Versioned migrations (`hmc-smc-portal-ui-demo/supabase`) |
|---|---|---|
| Schema | `portal` (set via `db:{schema:"portal"}`) | `public`, `portal_`-prefixed |
| Cases | `cases` — **inline `patient_name`**, clinic-workflow `status` enum | `portal_cases` + `portal_patients` + intakes + billing prep |
| Status timeline | none | `portal_insurance_case_status_history` |
| Legacy import tables | none | `portal_legacy_import_batches/staging/exceptions` (012) |
| Migrations in repo | **none** (schema is externally managed) | 001–014 |
| Roles | nurse / branch_staff / admin | admin / clinic_user / reception_user |

The Python runner + 012 schema target `public.portal_*`; the app the owner
actually clicks targets `portal.*`. **The import must land where the app can see
it.**

**Recommendation (Option 3 — legacy as an admin-only module in the app's
`portal` schema):**
- Stand up a versioned migrations home for `hmc-portal` (it has none today) and
  port the 012 legacy module into the **`portal`** schema, adapted to the app's
  shapes: `portal.legacy_import_batches`, `portal.legacy_case_staging`,
  `portal.legacy_import_exceptions`, `portal.insurance_case_status_history`, and
  a dedicated `portal.legacy_insurance_cases` table (admin-only) rather than
  overloading the operational `cases` table.
- Rationale: the legacy follow-up workspace (GOP / Waiting Final GOP / Paid) is an
  admin-only concern; keeping it in its own table avoids disturbing the live
  clinic `cases` workflow and its `status` enum, while still living in the schema
  the app already queries. Reconciliation to operational `cases` (if ever wanted)
  becomes a later, optional step.

**Alternatives to weigh:** (1) import into `public.portal_*` and build a
separate admin client with `schema:"public"` — fragmented UX, two backends;
(2) merge legacy into operational `cases` — pollutes the clinic workflow + needs
an insurance-status concept the app's enum lacks.

> **Need from Mohamed:** confirm Option 3 (or pick an alternative), and confirm
> the canonical Supabase project/schema (the `portal` schema the app uses — the
> types note "hmc-medical's portal schema"). Everything below assumes Option 3.

---

## 3. Architecture (local-only, admin-auth, RLS-enforced, no frontend secrets)

```
Admin browser (local) ── upload .xlsm ──▶ Next.js Server Action (runs locally on
                                          Mohamed's machine; `next dev`/local build)
                                            │  parse worksheet (server-side)
                                            │  classify + hash (PHI stays server-side)
              ┌── ANALYZE mode ─────────────┤  → returns PHI-SAFE aggregates only
              │                             │
              └── COMMIT mode ──────────────┤  → RPC portal.import_legacy_batch(jsonb)
                                            ▼      (SECURITY DEFINER, is_admin() gate,
                                          Supabase   single transaction)
                                          (portal schema, admin-only RLS)
```

- **Runs locally only.** Not on the public GitHub Pages demo. The feature is
  gated behind `requireAdmin()` (mirrors `app/admin/*`) + middleware + RLS.
- **PHI path:** browser → local Next server → Supabase. Never through Claude/MCP.
- **No service-role key in the client.** Two clean options for the privileged
  write, in preference order:
  1. **Session client + `SECURITY DEFINER` RPC** (recommended): the import runs
     as the logged-in admin; the RPC re-checks `portal.is_admin()` and does the
     whole insert in one transaction. No service-role needed at all.
  2. Server-only `createAdminClient()` (already exists, service_role, never
     bundled) only if an RPC proves insufficient. Avoid if possible.
- **Atomicity:** all inserts for a batch happen inside one DB transaction in the
  RPC → partial failure inserts nothing (mirrors the runner's single-transaction
  rollback + `IMPORT FAILED — NOTHING INSERTED`).
- **Next.js 16 caveat:** per `hmc-portal/AGENTS.md`, this Next version diverges
  from training data — read `node_modules/next/dist/docs/` before writing
  Server Actions / Route Handlers / file-upload handling.

---

## 4. Schema work (additive migrations in the `portal` schema, synthetic-tested)

New versioned migrations under a new `hmc-portal/supabase/migrations/` (or the
agreed home), ported/adapted from 012:

1. **Enums:** `legacy_batch_status`, `legacy_validation_status`,
   `insurance_status` (pending / insurance_confirmed / gop_requested /
   gop_received / invoice_prepared / invoice_issued / submitted /
   waiting_final_gop / partially_paid / paid / rejected / closed / needs_review).
2. **`portal.legacy_import_batches`** — source_name, **source_file_hash**,
   **source_content_hash**, source_sheet_name, started/completed, row counters
   (total/valid/imported/exception/duplicate), status, created_by, notes.
3. **`portal.legacy_case_staging`** — batch_id, source_row_number,
   source_our_ref, **masked_patient_identifier**, mapped_payload (jsonb),
   validation_status, validation_errors (jsonb), **matched_existing_case_id**,
   imported_case_id. (Mirrors 012; the matched-existing column powers re-import.)
4. **`portal.legacy_import_exceptions`** — batch_id, row, our_ref, reason, detail.
5. **`portal.insurance_case_status_history`** — append-only; case_id, status,
   `original_legacy_status_text`, `normalized_status`, status_date, reason,
   changed_by, `source_type ∈ {imported_initial_status, admin_manual_update,
   reimport_sync}`.
6. **`portal.legacy_insurance_cases`** — admin-only home for imported rows
   (patient identity, insurer, refs, currency, invoice/GOP amounts, current
   normalized status, batch lineage, `admin_edited_at`/`admin_reviewed`).
7. **RPCs (SECURITY DEFINER, `is_admin()` gate, locked search_path):**
   - `portal.import_legacy_batch(p_payload jsonb, p_file_hash, p_content_hash, p_source_name, p_sheet)` → inserts batch + staging + exceptions + promoted cases + initial status history; returns PHI-safe aggregate row.
   - `portal.rollback_legacy_batch(p_batch_id)` → deletes a batch's rows **only if
     no post-import admin edits/status changes exist** (else refuses, lists
     conflicts). Mirrors the runner's `--rollback`.
   - `portal.reconcile_legacy_batch(p_batch_id)` → computes re-import diff
     (see §6) and writes proposed actions to staging; applies nothing until
     admin approves.
8. **RLS:** admin-only on all legacy tables (`for all ... using
   (portal.is_admin())`); anon `REVOKE ALL`; status-history append-only (no
   update/delete). Extend the existing `portal_security_verification.sql` analog
   to prove non-admin + anon denial.

---

## 5. Import pipeline (parse → validate → hash → classify)

- **Parser:** add a pinned Node xlsx reader (SheetJS `xlsx` or `exceljs`). Read
  **only the configured insurance worksheet** (`Master Sheet`). `.xlsm` macros
  are never executed (we read cell values only).
- **Structure validation:** assert the worksheet exists and the mapped header
  columns match the expected layout (index→title from
  `PORTAL_MASTER_SHEET_LEGACY_IMPORT_MAPPING.md`). Abort with a clear,
  PHI-safe error if columns drift.
- **Hashing (must mirror Python for cross-tool agreement):**
  - file hash = SHA-256 of the uploaded bytes;
  - content hash = SHA-256 over normalized case-data cells of the worksheet
    (same normalization as `content_hash()`).
  Both stored on the batch row; shown masked in the UI.
- **Classification (TS port of `classify()`, locked by parity test):**
  promote vs exceptions vs soft-flags + duplicate detection + currency/status
  normalization — identical rules to the Python oracle.
- **ANALYZE vs COMMIT:** ANALYZE writes nothing (or only an `inspection_only`
  batch row with hashes + counts, no PHI) and returns the preview; COMMIT runs
  the RPC. Explicit Admin confirmation required between them.

---

## 6. Re-import / reconciliation rules (newer snapshot, no blind overwrite)

On a later snapshot upload, `reconcile_legacy_batch` categorizes each row:

- **Has OUR Ref** → match by **exact** `our_ref` against existing legacy cases:
  - no match → **NEW** (insert).
  - match, only status differs (e.g. `GOP → Paid`) → **STATUS_UPDATE**: append
    `insurance_case_status_history` (`source_type='reimport_sync'`), advance
    current status — **unless** an admin manually changed it post-import, then →
    **CONFLICT** (review).
  - match, non-status fields differ → if the case was admin-edited/reviewed →
    **CONFLICT** (review queue); else surface as **FIELD_CHANGE** for admin
    approval. Never silently overwrite.
  - identical → **UNCHANGED** (skip).
- **No OUR Ref** → never invent a retroactive ref. Compute a stable fingerprint
  (normalized name + DOB + visit_date + insurer + invoice amount) to find a
  prior no-ref row:
  - unique fingerprint match → propose link, **admin confirms** (never auto-merge).
  - multiple/partial → **AMBIGUOUS** → review queue.
  - none → **NEW** (Not Previously Assigned).
- **Never auto-delete** cases absent from the newer sheet → flag "missing in
  latest snapshot" for awareness only.
- Every applied change writes an audit entry + (for status) a history row.
- A **Reconciliation Review** screen shows masked per-row proposed actions;
  admin approves/rejects; approved actions apply in one transaction.

---

## 7. Admin UI/UX (`/admin/legacy-import`, follows existing `app/admin/*` patterns)

- **Upload/select** the `.xlsm` (drag-drop or file picker). Choose worksheet
  (default `Master Sheet`).
- **Validation result** banner (structure + mapped columns OK / column drift).
- **PHI-safe preview summary** (the required fields, all aggregate — no names):
  - total rows detected
  - promotable legacy cases
  - rows preserving original OUR Ref
  - rows without OUR Ref → **Not Previously Assigned**
  - Paid / Closed count
  - Active Follow-Up count
  - soft-flag counts (missing insurer, invalid currency, missing DOB, no-ref)
  - duplicate exceptions
  - missing-critical-data exceptions
  - masked file hash + content hash
- **Explicit confirm** ("Import N cases" requires a deliberate click; ANALYZE
  never writes).
- **Batches list** (`portal.legacy_import_batches`): date, source, hashes, counts,
  status; **Rollback** action (guarded).
- **Batch detail:** masked staging rows + exceptions; reconciliation actions for
  re-imports.
- **Legacy follow-up workspace** (Phase 5): admin-only list of imported insurance
  cases with current status; manual status change (GOP / Waiting Final GOP /
  Paid) writes a history row + audit.
- Reuse `AppShell`, `Card`, `Badge`, `EmptyState`, `Button`, server actions +
  `useFormStatus` (as in `AddCompanyForm`).

---

## 8. Synthetic test data + testing

- **Generator** (`scripts/make_synthetic_master_sheet.*`): deterministic, seeded
  `.xlsm` with the same 18-column layout and obviously-fake patients. Controlled
  distribution → known expected aggregates: rows with/without OUR Ref (HMC/SMC
  shapes, fake digits), exactly one duplicate-ref pair, one junk-currency, a few
  missing-insurer/DOB, a spread of statuses incl. Paid/GOPED/FGOP.
- **Second "newer snapshot"** variant: a few `GOP→Paid` advances, one new row,
  one ambiguous no-ref addition, one admin-edited-then-changed conflict → drives
  reconciliation tests.
- **Tests:**
  - *Parity:* TS classifier vs the Python oracle on the same fixture → identical
    counts (promote / exceptions / no-ref / missing-insurer / invalid-currency /
    missing-DOB / duplicates).
  - *Hashing:* file + content hash deterministic and equal to the Python scheme.
  - *RLS:* non-admin + anon denied on every legacy table; admin allowed.
  - *E2E:* upload → analyze (expected aggregates) → commit (DB counts match) →
    rollback (restores zero) → re-import second snapshot → reconciliation
    categories correct → approve a status change → history appended.
- **Real-data parity gate (closing time, local, dry-run only):** run the Python
  `--dry-run` and the TS analyzer against the closing snapshot; assert identical
  aggregates **before** any commit. Ties the feature back to the validated P3B
  numbers.

---

## 9. Security & scope guardrails (enforced throughout)

- Synthetic data only until Mohamed supplies + approves the 31-05 closing snapshot.
- Feature lives in `hmc-portal` only; the public GitHub Pages demo gets nothing
  Supabase-connected for import.
- Admin-authenticated (`requireAdmin()` + middleware) + verified RLS +
  `SECURITY DEFINER` `is_admin()` re-check.
- No service-role key or any secret in client code (server-only env;
  `NEXT_PUBLIC_*` never carries the service key).
- `hmc-v2` untouched; Invoice Manager / PDF engines / OneDrive folders / Master
  Sheet untouched; Master Sheet read-only, no sync-back.

---

## 10. Phased delivery

| Phase | Deliverable | Exit criteria | Real PHI? |
|---|---|---|---|
| **0 (done)** | Deferral recorded + this plan | Decision log + plan written | No |
| **1** | Decision 0 confirmed; ported legacy migrations + RPCs + RLS in the `portal` schema (applied to a dev/local Supabase) | RLS verification passes; tables exist | No |
| **2** | Synthetic generator + TS classifier + hashing + parity/unit tests | Parity with Python oracle green | No (synthetic) |
| **3** | `/admin/legacy-import`: upload → analyze → preview → confirm → commit; batches list; rollback | E2E first-import green on synthetic | No (synthetic) |
| **4** | Re-import reconciliation (matching, status sync, conflict review) + audit | Reconciliation E2E green on synthetic | No (synthetic) |
| **5** | Legacy follow-up workspace (status GOP/Waiting Final GOP/Paid + history) | Manual status change audited | No (synthetic) |
| **6 (gated)** | **Closing-snapshot go-live runbook** (see §11) | Owner-run, dual-tool parity, verified | **Yes — owner-approved** |

---

## 11. Closing-snapshot go-live runbook (deferred to ~31-05-2026)

1. Mohamed finishes May edits and produces `Master Sheet New - Closing Snapshot
   31-05-2026.xlsm` (a file he will not further edit).
2. Freeze it read-only in the private import area; record file + content hash.
3. **Dual-tool parity dry-run** (local): Python `--dry-run` AND the Portal
   ANALYZE → identical aggregates. Abort on any mismatch.
4. Owner uploads the snapshot in `/admin/legacy-import`, reviews the PHI-safe
   preview, clicks confirm → batched insert + audit.
5. Verify aggregate post-import counts; rollback available by batch ID until
   status edits begin.
6. Portal becomes the follow-up workspace; future newer snapshots go through
   reconciliation (§6), never blind overwrite.

---

## 12. Open decisions for Mohamed

1. **Decision 0** (§2): confirm Option 3 (legacy module in the app's `portal`
   schema) + the canonical project/schema.
2. Confirm the **status normalization table** (drives follow-up) — see mapping doc §"status normalization".
3. Reconciliation policy for **non-status field changes** on re-import: auto-apply
   safe changes, or queue all for review? (Default: queue.)
4. No-OUR-Ref **fingerprint fields** for re-import matching (default proposed in §6).
5. Where the app's **migrations home** lives (it has none today).
