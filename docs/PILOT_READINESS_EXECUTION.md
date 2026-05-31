# Aegis Portal — Pilot-Readiness Execution (Phases 3–7)

_Single controlled sprint. Started 2026-05-31. Owner: Mohamed. Backend: hmc-medical (`zlgxalmaiwatnoydgkxo`), supabase mode. hmc-v2 untouched._

**Rule:** work in order; self-test each phase before the next; commit/deploy only stable verified work; never break Sprint 1/2 (mock 5173 + live login/attendance). Stop only for: destructive DB action, security risk, missing owner business rule, deploy failure, or a failed test needing a decision.

Live verify server: `aegis-fix` (5188, `dev:supabase`). Mock fallback: `npm run dev` (5173) — must stay byte-identical.

## Baseline verified (this session)
- [x] Live app loads (supabase mode), tropitel sees only its 2 RLS-scoped cases (`SHMC-3152026.002` cash, `HMC202630001` insurance). No console errors.
- [x] DB ground truth pulled: 34 portal tables, migrations 001–020, all enums/RPCs/RLS for the 5 phases.
- [x] `portal_record_collection` confirmed correct (Visa→visa_bank/EGP/FX; cash→physical_cash; sets treasury_channel + actual_collected_amount + collected_by + treasury movement).
- [x] Treasury accounts exist for all branches: physical_cash {EGP,EUR,USD,GBP} + visa_bank {EGP}.

## PHASE 3 — Direct Case Intake Finalization ✅ VERIFIED
- [x] Cash: multiple payment lines + physical cash currency + created_by — `SHMC-3152026.004` (2× physical_cash EUR 60+40, 2 treasury movements)
- [x] Card/Visa: bank/EGP movement (visa_bank), editable FX (invoice EUR≠EGP) — `SHMC-3152026.003` (visa_card→visa_bank, EUR100 @FX55 = EGP 5500)
- [x] Insurance: facility SMC, company, ref, email, excess Yes — `SHMC-3152026.005` (intake + email + has_patient_excess; charge patient_excess 50 EUR; collection patient_excess/physical_cash/50)
- [x] No fake cash unless real line — HMC202630001 insurance w/o excess has 0 collections ✓
- [x] Form stability: tab-switch (visibilitychange+blur/focus) keeps form mounted + values intact — no sessionStorage needed (SIGNED_IN re-emit guard works)
- [x] Scoping: romance sees 0 cases (RLS impersonation); tropitel sees its 5; admin sees all 5 (RLS impersonation)
- [x] Admin Cases Master: in pilot now redirects to live `/admin/p2c-cases` (was mock); demo banner/footer hidden in supabase mode
- DB correctness: `portal_record_collection` confirmed (channel routing + actual amount + treasury movement). All collected_by set.

## PHASE 4 — Transfers & Receiving ✅ VERIFIED
- [x] Create transfer to Al-Kawther — `SHMC-3152026.006` (route transfer_to_al_kawther, transfer status sent, tropitel→al_kawther)
- [x] Receiving branch sees incoming — kawther@portal.test saw `SHMC-3152026.006` in Incoming Transfers (RLS)
- [x] NEW RPC `portal_receive_transfer` (migration 021, SECURITY DEFINER, scope-checked, idempotent) — verified: case→received, current_location:=al_kawther, transfer→received + received_by/at
- [x] Receive → classify Cash + treatment_mode surgical — `SHMC-3152026.006`
- [x] CRITICAL: receive-as-Cash full form + Visa→EGP bank — collection visa_card→visa_bank EUR80 @FX56 = **EGP 4480 recorded at al_kawther** + treasury movement
- [x] Receive → classify Insurance (HMC) — fixture `5d2e11de` (intake insurer+ref+email, facility HMC, has_excess false, 0 collections = no fake cash)
- [x] OUR ref continuity — same case row, our_ref unchanged through receive+classify
- [x] Admin sees all (route + transfer state) via RLS (admin impersonation = all cases)
- New: portalData `receiveTransfer`/`classifyReceivedCase`; context `receiveTransfer`/`classifyReceived`/`refreshCases` supabase-aware; `LiveReceptionIncomingDetail` (mock body untouched).

## PHASE 5 — Collections / Treasury / Daily Report (safe minimum) ✅ VERIFIED
- [x] Collections list live (pre-sprint) + new treasury summary tiles
- [x] `fetchCollections`/`fetchCases` accept optional `{from,to}` date range; new pure `summarizeCollections` helper
- [x] Treasury overview live (clinic + reception): "Treasury by Channel & Currency" — verified al_kawther shows **VISA / BANK · EGP 4,480.00 (1)**; physical cash separate per currency. ReceptionTreasuryP2C now has supabase branch.
- [x] Daily Report (clinic/reception/admin): date-selectable (defaults today), real cases+collections; verified al_kawther 31-05 shows the EGP 4480 collection, 27-05 shows the received case `SHMC-3152026.006`; RLS-scoped
- [x] No fake FX / no cross-currency reconcile ("no grand total across currencies")
- [x] Handover full closure DEFERRED (Phase 5b) with a clear visible note + Print button (safe minimum)
- [x] Pilot fix: new-case `TODAY_DATE` now real local date in supabase mode (was hardcoded 2026-05-27); mock unchanged

## PHASE 6 — Specialist Visits (operational only, no billing) ✅ VERIFIED
- [x] NEW RPC `portal_insert_encounter` (migration 022, SECURITY DEFINER, atomic sequence_no per case+type, scope-checked)
- [x] portalData: `insertEncounter`, `updateEncounter`; CASE_SELECT joins `portal_encounters` → mapped to c.sessions
- [x] New `LiveSpecialistVisits` panel (specialist/type + date-time + note + status; add/close) embedded in clinic + reception case-detail (supabase mode); mock note-panel gated to mock mode
- [x] Verified on `SHMC-3152026.006`: added 2 visits (seq 1+2, atomic), closed #1 → completed+check_out_at, #2 active; created_by set; no duplicate patient (encounters are case children)
- [x] Admin sees encounters via RLS (impersonation = 2 visible). Operational only — no billing integration.

## PHASE 7 — Cleanup, Safety, Handover (inventory + proposal only; NO destructive action) ✅ INVENTORY DONE
Inventory (read-only, 2026-05-31) — nothing deleted/disabled:
- TEST users (10, `@portal.test`): admin, claude-verify-admin, kawther, mamsha, menamark, pharaoh, romance, sahl_hasheesh, sheraton, tropitel
- REAL owner (KEEP, never touch): `mohamedqasem436@gmail.com`
- Operational test data: 7 cases, 7 patients, 5 staff (Nadia Mostafa, Dr Karim Fouad, Mahmoud Khamis, Mahmoud Saeed, Amr Tarek), 6 collections, 2 transfers, 2 encounters, 1 case_charge, 1 nurse shift, 1 doctor duty, 6 treasury movements, 3 insurers (Allianz Care S3, Phase3 SMC Insurer, Phase4 Receive Insurer), 3 insurance intakes
- KEEP (reference/master, untouched): locations 9, rooms 30, nationalities 245, payment_methods 4, billing_facilities 2, treasury_accounts 40
- [x] Proposal: see final report. **Owner-gated** — no disable/delete until explicit approval. *.test users left enabled per instruction.
- [x] Final pilot checklist in report.

## Deploy
- [ ] Production build passes (`npm run build:pages`)
- [ ] Deploy to GitHub Pages staging (authorized) only after all above verified
- [ ] Live smoke tests against deployed URL

## Test case refs created this sprint
- `SHMC-3152026.003` — VisaTest PatientVisa — direct Cash, 1 Visa/Card line → visa_bank EGP 5500 @ FX55 (Phase 3)
- `SHMC-3152026.004` — CashMulti PatientCash — direct Cash, 2 physical_cash EUR lines (60+40) (Phase 3)
- `SHMC-3152026.005` — InsExcess PatientIns — direct Insurance SMC + excess 50 EUR (intake+charge+collection) (Phase 3)
- `SHMC-3152026.006` — XferTest PatientKawther — transfer tropitel→Al-Kawther, received as Cash (Visa→EGP 4480) + Surgical (Phase 4)
- `5d2e11de…` (XferIns PatientInsTest) — SQL transfer fixture, received as Insurance HMC, no collection (Phase 4)
_(pre-existing owner test cases: `SHMC-3152026.002` cash, `HMC202630001` insurance HMC)_

## Known limitations / deferred
- Handover full closure (Phase 5b)
- Real clinic-staff login passwords (Edge Function, owner-gated)
- Master Sheet / Old Cases import (owner-gated, out of scope)
