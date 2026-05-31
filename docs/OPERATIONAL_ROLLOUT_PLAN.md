# HMC / SMC Aegis Portal — Operational Rollout Plan
_Authored 2026-05-30. Source of truth for the move from UI demo → daily operational system._

> Scope rule: **Aegis Portal = `hmc-smc-portal-ui-demo`** (Vite/React, localhost:5173), real UI under `/design-preview/*`.
> The Next.js `hmc-portal` (port 3000) is **NOT** operational — leave isolated, do not use, do not delete.

---

## 1. Executive summary (business language)

The Aegis Portal becomes the one daily system where:
- clinics & branches **open** insurance / cash / transfer cases,
- the insurance team **completes** the billing details Claude needs,
- Claude **generates** invoices from those cases + the patient's OneDrive documents,
- and every case's **money story** (first invoice → GOP → discount → final GOP → paid → collected → closed) is tracked to closure with full history.

It replaces the fragmented chain: Google Sheet → Excel Master Sheet → Claude → Manager correction → manual follow-up.

**The audit's headline:** most of this already exists.
- The approved **Aegis UI** already has the screens: clinic/reception case registration, admin oversight, Old Cases, billing-field completion, collections, reports, user management.
- The operational **database already exists** in Supabase project `hmc-medical` (the `portal_*` schema): cases, insurance, **admin-only billing-prep**, full **status-history lifecycle**, finance/treasury, and a **safe legacy-import** pipeline — with row-level security written.
- The two missing links: (1) the UI is still on demo data, **not yet connected** to that database ("P3B"); (2) real users/permissions + a few operational fields & the Claude billing-handoff need finishing.

**Tonight:** make the **local** portal genuinely usable (persistent data, real access control, all clinics/branches + test users, complete billing-prep fields, a Claude billing-handoff seam) — touching **no production data**.
**Tomorrow:** you test the workflow with real people, locally.
**Connecting the live shared backend** (so multiple users see each other's cases) is the next step and is **gated on your explicit approval** — it crosses into real users / RLS / PHI.
**01-06:** start registering new cases in the Portal. **Historical cases ≤ 31-05** import into Old Cases after the Master Sheet closing snapshot.

---

## 2. Current assets / current-state audit

### Frontend — `hmc-smc-portal-ui-demo` (Vite + React 18 + react-router + Tailwind, 5173)
- Real operational UI lives under **`/design-preview/*`** (entry `/` → `/design-preview/login`). The legacy P1 tree (`/clinic/*`, `/admin/*` under `AppShell`) is **dead weight** (static mock, not the entry).
- Design system: `src/premium/theme.css` (navy/gold tokens, `.theme-premium`) + `src/premium/primitives.jsx` (Card/Button/Badge/Table/Field/Modal). Two shells: **AdminShell** (dark sidebar) + **OperationalShell** (mobile-first).
- State: **UserModeContext** (active persona, sessionStorage) + **DemoStateContext** (in-memory reducer: `ADD_CASE/UPDATE_CASE/ADD_TRANSFER/ADD_COLLECTION/ADD_USER…`). **Resets on refresh. Plaintext mock auth.**
- Roles: `admin`, `clinic_nurse`, `reception_*`. **6 external clinics** (tropitel, romance, sahl_hasheesh, mamsha, pharaoh, menamark) + **2 center branches** (al_kawther, sheraton — 15 rooms each).
- Already-built screens (premium): clinic & reception dashboards + **case intake** + scoped case lists + transfers + treasury + attendance + daily reports; admin dashboard, control-center, **full-control new case**, cases-master, case-detail, collections, daily/monthly reports, **Old Cases** (`admin/legacy-review`), p2c oversight, reference-lists, **Insurance Completion** (billing-prep), **Users & Staff CRUD**.
- Intake forms are wired (to the in-memory reducer); lists already **scoped** by `registeredAtId/branchId/clinicId` → multi-tenant-shaped.

### Backend — Supabase org "HMC"
| Project | Status | Role |
|---|---|---|
| **`hmc-v2`** (`gynsbdiofcizwbymzppq`) | ACTIVE | 🔒 **PROTECTED.** Canonical identity/roles/clinics + reference data (price_list 914, medical_items 2463, lab_tests 198, insurance 25, hotels 40, nationalities 245, exchange_rates, banks) + PHI patients(5)/cases(6). RLS-hardened. |
| **`hmc-medical`** (`zlgxalmaiwatnoydgkxo`) | ACTIVE | **Portal operational backend.** `public.portal_*` — 33 tables (below). Migrations 001-015 + RLS 009. Near-empty, **not yet wired to UI**. |
| `PS Shop` | INACTIVE | Unrelated. |

`portal_*` tables (hmc-medical): locations, rooms, billing_facilities, staff, user_profiles, user_location_scopes, patients, cases, encounters, transfers, room_assignments, insurance_companies, local_assistance_companies, insurance_intakes, **insurance_billing_preparations (ADMIN-ONLY)**, case_charges, collections, treasury_accounts/movements, expenses, handovers (+cash/visa lines), nurse_shifts, doctor_daily_duty, audit_log, legacy_import_batches/case_staging/import_exceptions, **insurance_case_status_history**, case_reference_counters.

- Repo migrations: `hmc-smc-portal-ui-demo/supabase/migrations/001…015` + functions/seed. Legacy ETL: `D:\Claude Code Engine\_p3b_legacy_import` (dry-run-first, staging-only, integrity-compare).
- **Verify before wiring:** live truth is `public.portal_*` (confirmed via list_tables). Repo migration naming references a `portal` schema — reconcile repo↔live before any write.
- **`015_portal_canonical_admin_bridge`** links portal admin identity to **hmc-v2** (cross-project) — review with owner before relying (hmc-v2 protected).

### Billing + contacts
- Billing skills (HMC v3.0 + SMC) read a patient folder → emit **`case.json`** + PDFs. `case.json` = the integration contract (`meta/patient/dates/analysis/sections/labs/meds/totals_preview/needs_review`). **Engines locked.**
- **Invoice Manager** (`D:\HMC Desktop APP`) = desktop `case.json` editor with dedupe; stays the correction tool, later admin-only from Portal.
- Contacts: **mail data.CSV** (117MB Outlook export — Europ Assistance/Allianz/AXA/MAPFRE/Roland/Global Excel/GMMI…) + `D:\Europ Assistance` ref-folders + GlobalPPO xlsx. **Real PII/PHI** — extract metadata only, human-reviewed, never bulk-import.

---

## 3. Gap analysis — current Portal vs real workflow

| Business need | Today | Gap → action |
|---|---|---|
| Clinic/branch case registration | ✅ intake forms wired (mock) | Persist + validate; later write to `portal_cases` |
| Admin sees all; clinic sees own | ✅ scoped lists | Make access **enforced** (ProtectedRoute + RLS), not menu-only |
| Old Cases admin-only | ✅ screen exists, menu-gated | Real route guard; wire to `portal_legacy_case_staging` (post 31-05) |
| Billing-prep fields (SC%, transport, excess, facility, currency, ins/assist, OUR ref, notes, status) | ✅ on Insurance Completion + New Case | Add **missing-data note** + **OneDrive folder path**; persist; admin-only |
| Full insurance lifecycle + financials | ✅ fields on Case + `statusHistory[]`; backend has `insurance_case_status_history` | Surface a status timeline UI; wire to backend |
| Claude billing handoff | ❌ none | Add **Ready-for-Billing / billing-queue** + folder ref (the seam Claude reads) |
| Persistence across refresh | ❌ in-memory | Add localStorage (tonight) → Supabase (P3B) |
| Real auth & security | ❌ plaintext mock | Supabase Auth + RLS (gated P3B) |
| Insurance/assistance contacts DB | ❌ static seeds | Offline extractor from mail CSV → review → seed (gated) |
| Real shared multi-user data | ❌ per-browser | P3B connection (gated) |

---

## 4. Sprint roadmap — tonight → first live use (01-06)

**Tonight (LOCAL, no backend writes, no PHI) — Sprints 1-4:**
- **S1 — Operational hardening:** localStorage persistence (+ admin "reset demo data"); `ProtectedRoute` + central role→route permission map; redirect legacy P1 routes to premium (archive, don't delete).
- **S2 — Users / clinics / branches:** seed all roles + 6 clinics + 2 branches + admin with clear test logins; Users & Staff CRUD persists; new users can log in.
- **S3 — Billing-prep completeness + Claude seam:** add `missingDataNote` (non-blocking) + `onedriveFolderPath`; add **Mark Ready for Billing** → billing-queue list for admin.
- **S4 — Connection scaffolding (inert):** `src/lib/api` seam with `mockApi` (now) + `supabaseApi` stub behind `VITE_DATA_BACKEND` flag (default mock); field-map doc (mock Case → `portal_patients`+`portal_cases`+`portal_insurance_billing_preparations`+status history).

**Before 01-06 (GATED — your approval) — Sprints 5-7:**
- **S5 — P3B connect:** confirm project home; verify repo↔live schema; create real Supabase Auth users; verify RLS per role; point env at `hmc-medical`; flip flag for **read-then-write**; backup/rollback ready.
- **S6 — Live case registration:** clinic/reception/admin intake writes `portal_*`; scoped reads via RLS; status lifecycle live.
- **S7 — Billing handoff live:** Insurance Completion writes `portal_insurance_billing_preparations` + queue; Claude reads pending from Supabase + OneDrive → `case.json`/PDFs → write-back invoice#/amount/status (dedupe on case_id).

---

## 5. Longer roadmap (after first live use)
- **R1 — Old Cases import** from 31-05 closing snapshot (staging → exceptions review → promote).
- **R2 — Contacts intelligence:** seed `portal_insurance_companies` + `portal_local_assistance_companies` from reviewed mail-CSV extract; auto-fill company/assistance during intake.
- **R3 — Invoice Manager from Portal** (admin-only), export-only-modified, dedupe dashboard.
- **R4 — Financial dashboards:** outstanding, ageing, collections, discounts, per-clinic/insurer.
- **R5 — Email linkage:** tie `D:\Europ Assistance` ref-folders + emails to cases by insurance ref.
- **R6 — Hardening:** audit log surfacing, backups cadence, monitoring, controlled deploy.

---

## 6. Exact implementation sequence (dependency order)
1. S1 persistence + guards → 2. S2 users/clinics → 3. S3 billing-prep + queue → 4. S4 api seam + field-map → **[GATE D1/D2]** → 5. S5 connect (auth+RLS+env) → 6. S6 live intake reads/writes → 7. S7 billing handoff + write-back → **[GATE 31-05]** → 8. R1 Old Cases import → 9. R2 contacts → 10. R3-R6.

---

## 7. Test plan after each sprint
- **S1:** build passes; refresh keeps data; login as admin/clinic/reception → correct home; typing an admin URL as clinic redirects/blocks; legacy `/clinic` `/admin` redirect.
- **S2:** each clinic/branch user logs in, sees only own scope; admin sees all; create user in UI → can log in.
- **S3:** complete billing fields on a case incl. missing-note + folder path; "Mark Ready for Billing" → appears in admin queue; clinic cannot see billing-prep.
- **S4:** `VITE_DATA_BACKEND=mock` (default) unaffected; `=supabase` without env shows a clean "not connected" (no crash); field-map doc reviewed.
- **S5 (gated):** RLS proof per role on a throwaway test row; rollback rehearsed; read-only before write.
- **S6/S7 (gated):** end-to-end: clinic opens case → admin completes billing → Ready → Claude drafts `case.json` → write-back shows on dashboard, no duplicate.
- Verification uses the browser preview tools (snapshot/click/console) + `npm run build`.

---

## 8. User / role / permission plan
- **Roles:** `admin` (owner — all clinics/branches, all admin tools, billing-prep, Old Cases, users), `clinic_nurse` (own external clinic — register + view own cases; **no** billing/admin), `reception` (own center branch — register + rooms + treasury + own cases), optional `insurance_team` later (billing-prep without HR/treasury).
- **Enforcement layers:** (1) UI menu, (2) **ProtectedRoute + permission map** (new tonight), (3) **Supabase RLS** via `portal_user_profiles` + `portal_user_location_scopes` (exists; enforced at P3B).
- **Old Cases & billing-prep:** admin-only at all three layers.
- **Reception data-driven:** one `reception` role + branch scope rows (not per-branch hard-coded personas) when wired.
- **Tonight's test users (local, mock):** admin + one per clinic + one per branch, documented credentials. **Real Auth users seeded server-side at P3B — never ship demo passwords.**

---

## 9. Supabase schema / RLS connection plan (P3B — GATED)
1. **Confirm project home** = `hmc-medical` (where `portal_*` lives). Clarify intended `hmc-v2` relationship (the 015 bridge). **[Decision D1]**
2. **Reconcile repo↔live schema** (`public.portal_*` confirmed live; align migrations/types).
3. Generate types from live schema (read-only) → typed `supabaseApi`.
4. **Create real Auth users** + `portal_user_profiles` + `portal_user_location_scopes` (server-side). **[Decision D2 — credentials/users/RLS]**
5. **Verify RLS** with a throwaway test row per role (admin all; clinic/reception scoped; billing-prep admin-only) **before** any real data.
6. **Backup/rollback** ready (snapshot + documented revert) before first write.
7. Point `.env.local` at `hmc-medical`; flip `VITE_DATA_BACKEND=supabase`; **read-only first**, then enable writes screen-by-screen.
8. Anon/publishable key only in frontend; service-role server-only.

---

## 10. Old Cases import plan (post 31-05 closing snapshot — GATED)
- Source: frozen Master Sheet **closing snapshot ≤ 31-05** (not the live sheet).
- Pipeline (`_p3b_legacy_import`): classify each row (insurance/cash/transfer, facility, status) → **stage** into `portal_legacy_case_staging` (never operational tables) → `05_integrity_compare` reconciles counts/totals → review `portal_legacy_import_exceptions` → **promote** approved rows.
- Old Cases UI (`PremiumAdminLegacyReview`) rewires from synthetic → staging; stays **admin-only**, separate from clinic daily entry.
- Stay **dry-run** until the snapshot is frozen + you approve.

---

## 11. Email / contact intelligence plan (`mail data.CSV` + `D:\Europ Assistance`)
- **Two-stage, human-reviewed, offline** (never load 117MB into the app; never bulk-import; never into mock/demo):
  1. Streaming extractor → dedupe `From (Name,Address)` → classify domains (insurer/assistance vs personal/hotel) → output a **candidate CSV** (company, aliases, domain, sample contacts).
  2. You review/confirm → seed only confirmed rows into `portal_insurance_companies` + `portal_local_assistance_companies` (+ aliases map).
- Phone/contact-person extraction (email-signature parsing): **deferred**, on-demand per company.
- `D:\Europ Assistance` ref-folders link emails/docs ↔ cases by insurance ref (later).
- **PII/PHI:** patient names in subjects/bodies — extraction keeps **company/contact metadata only**.

---

## 12. Invoice Manager / Claude billing integration plan
- **Seam = `case.json` + patient folder path.** Portal never reimplements billing; engines stay locked.
- **Billing queue contract:** case status `Ready for Billing` + `onedrive_folder_path` + billing-prep fields. Claude (local) reads pending from Supabase + reads OneDrive docs → runs HMC/SMC skills → writes `case.json` + PDFs to the patient folder → **writes back** invoice#/amount/status to the Portal case (**dedupe on case_id**).
- **Human-in-the-loop:** Ready → Claude drafts → **Invoice Manager corrects** → finalize. No silent auto-billing.
- **PHI:** generation stays **local on Mohamed's machine**; no patient docs to any server.
- Commands later: "Generate invoices for today's Pending insurance cases" / "…cases marked Ready for Billing" / "Review cases with reports but no invoice."

---

## 13. Risks & rollback
| Risk | Mitigation |
|---|---|
| Editing the wrong UI tree (legacy vs premium) | Touch only `src/premium/*` + `/design-preview/*`; archive legacy |
| "preview" naming → someone deletes the real UI | Rename/redirect entry to a clean path; doc it |
| Cosmetic access control exposes admin features | ProtectedRoute + permission map now; RLS at P3B |
| Connecting before RLS verified → data leak/over-expose | RLS proof per role on throwaway rows before real data |
| Touching protected `hmc-v2` | Off-limits; only `hmc-medical`; review 015 bridge first |
| Importing real PHI into demo | Old Cases stays synthetic until gated import; contacts = metadata only |
| Breaking locked invoice engines | Integrate only at `case.json`/folder boundary |
| Lost test data on refresh | localStorage tonight; Supabase later |
- **Rollback:** frontend = git revert (snapshots already in repo); backend = Supabase snapshot + documented revert before first write; all destructive/connect/deploy steps **stop for approval**.

---

## 14. Delivered tonight (LOCAL, safe)
- Persistent local Aegis Portal (survives refresh) with **enforced** role access.
- All clinics/branches + test users with documented logins.
- Complete billing-prep fields (+ missing-note + OneDrive path) and a **Ready-for-Billing** admin queue (the Claude seam).
- Inert Supabase connection scaffolding + field-map doc (one approval away from P3B).
- This plan doc + a task list + exact local URL & login instructions.

## 15. Ready for tomorrow's user test
- Real people walk the workflow locally: clinic/reception **register cases**, admin **sees all + completes billing + marks Ready**, Old Cases admin-only. Data persists per browser.
- (True multi-user **shared** data needs the gated P3B connection — recommend approving it for/at the test.)

## 16. Ready for 01-06 start
- After P3B approval + RLS verification: live case registration to `hmc-medical`, billing handoff to Claude, lifecycle tracking. Old Cases import follows the 31-05 snapshot.

---

## Gates needing your call (do not block tonight)
- **D1 — Project home:** confirm `hmc-medical` is the Portal's production backend; clarify the `hmc-v2` bridge (015). _Needed before P3B._
- **D2 — P3B connection:** approve creating real Auth users + RLS verification + env switch + backup/rollback. _Needed for shared multi-user testing._
- **D3 — Old Cases import:** confirm wait for 31-05 closing snapshot.
- **D4 — Contacts seeding:** approve the offline extractor before running on mail data.CSV.
