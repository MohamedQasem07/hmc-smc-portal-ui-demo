# PORTAL-UX-P2C.R2 — Final Local Review Report

**Sprint:** Complete Clinic Operations, Encounters, Treasury & Main Branch Workflow Demo
**Date:** 2026-05-27
**Scope:** Local UI/UX concept only — no backend, no deployment, no GitHub push.
**Status:** Ready for Mohamed's local review. Awaiting explicit approval before any backend / deployment work.

---

## 1. Baseline protection

| Asset | Status |
|------|--------|
| Public baseline `hmc-smc-portal-ui-demo_P2B2_AEGIS_BASELINE_6a64b16` | ✅ Unchanged — 197 files (verified at end of sprint). |
| Pre-R1 snapshot `…_P2C_PRE_R1_SNAPSHOT_20260527` | ✅ Present. |
| Pre-R2 snapshot `…_P2C_PRE_R2_SNAPSHOT_20260527` | ✅ Present (taken before R2 edits). |
| GitHub push / public deploy | ❌ Never executed. No `git push`, no `gh pr`, no Vercel/Pages action. |

---

## 2. Files changed for R2

| File | Kind | Purpose |
|------|------|--------|
| `src/data/p2cR1.js` | Extended | Added Encounter Pattern model, helpers, multi-session + inpatient seeds on existing demo cases. |
| `src/context/DemoStateContext.jsx` | **NEW** | Runtime in-memory demo state — reducer + actions + selector hooks. **Resets on browser refresh.** |
| `src/premium/PaymentLines.jsx` | **NEW** | Shared multi-line payment editor with Cash/Visa rules + editable FX (NO fixed 62.00). |
| `src/premium/OperationalShell.jsx` | Unchanged from R1 | Nav already exposes Treasury / Expenses / Attendance / Rooms. |
| `src/App.jsx` | Updated | Wrapped tree in `DemoStateProvider`, added route for Reference Lists. |
| `tailwind.config.js` | Updated | Added 24-column grid + col-span-13…24 utilities for the payment-line grid. |
| `src/pages/preview/p2c/clinic/ClinicNewCaseP2C.jsx` | Rewritten | Adds Encounter Pattern section, separates Tourist/Travel from Visit Check-In/Time, uses shared PaymentLines, dispatches CASE_ADD. |
| `src/pages/preview/p2c/clinic/ClinicMyCasesP2C.jsx` | Updated | Reads live cases, adds Encounter column + encounter summary cell. |
| `src/pages/preview/p2c/clinic/ClinicCaseDetailP2C.jsx` | Rewritten | Encounter timeline + Close Visit / Add Session / Close Session / Discharge actions. |
| `src/pages/preview/p2c/clinic/ClinicTransfersP2C.jsx` | Rewritten | Full-width operational table replacing cards. |
| `src/pages/preview/p2c/clinic/ClinicTreasuryP2C.jsx` | Rewritten | Demo-state aggregates + **Actual Delivered starts empty** + Match/Over/Shortage. |
| `src/pages/preview/p2c/clinic/ClinicAttendanceP2C.jsx` | Updated | Mutates demo state; reads live nurse shifts + doctor on duty. |
| `src/pages/preview/p2c/clinic/ClinicDailyReportP2C.jsx` | Rewritten | Live R2 daily report with date selector + Encounter / Treasury / Attendance sections. |
| `src/pages/preview/p2c/reception/ReceptionDashboardP2C.jsx` | Updated | Reads live room board + treasury. |
| `src/pages/preview/p2c/reception/ReceptionNewCaseP2C.jsx` | Rewritten | Full intake + Encounter (incl. Inpatient) + Center Room assignment + Treatment Mode + dispatches CASE_ADD + ROOM_ASSIGN. |
| `src/pages/preview/p2c/reception/ReceptionIncomingTransfersP2C.jsx` | Rewritten | Full-width operational table replacing cards. |
| `src/pages/preview/p2c/reception/ReceptionIncomingDetailP2C.jsx` | Updated | Confirm Receiving now dispatches TRANSFER_RECEIVE + CASE_UPDATE + ROOM_ASSIGN. |
| `src/pages/preview/p2c/reception/ReceptionBranchCasesP2C.jsx` | Rewritten | Full operational table with Center Room + Encounter + Treatment columns. |
| `src/pages/preview/p2c/reception/ReceptionCaseDetailP2C.jsx` | Rewritten | Branch-aware case detail with Discharge releasing the Center Room. |
| `src/pages/preview/p2c/reception/ReceptionTreasuryP2C.jsx` | Rewritten | Same Actual Delivered logic as clinic; no expense entry. |
| `src/pages/preview/p2c/reception/ReceptionDailyReportP2C.jsx` | Rewritten | Branch daily report with all R2 metrics. |
| `src/pages/preview/PremiumAdminP2CCases.jsx` | Updated | Reads live state; adds Hotel/Room, Center Room, Encounter, Treatment columns; new alerts. |
| `src/pages/preview/PremiumAdminReferenceLists.jsx` | **NEW** | Admin Control Center reference-lists UI concept. |

---

## 3. Interactive demo-state explanation

The new context provider `DemoStateProvider` (wrapping the whole app) holds an in-memory state seeded from `p2cR1.js`. Every workspace page now reads from this state via hooks (`useCases`, `useCasesForClinic`, `useCasesForBranch`, `useRoomBoard`, `useTreasuryFor`, `useVisaBankFor`, `useExpensesFor`, `useHandoversFor`, `useActiveShifts`, `useClosedShiftsToday`, `useDoctorOnDuty`, `useFindCase`, `useIncomingTransfers`, `useCaseAggregates`).

### Reset rules
- **State lives only in React memory.** Any browser refresh (F5, `window.location.reload()`, `window.location.href = …`) restarts from the R1 seed. The "Interactive Demo Only — entries are temporary" banner appears on every workspace page.
- **No localStorage / sessionStorage / cookies / IndexedDB / network calls.** Verified with grep — only one string match for the word "supabase" remains (a reassurance copy line on the demo landing page).

### Actions and the screens they update
| Action | Updates… |
|--------|----------|
| `addCase` (New Case form submit) | My Cases · Transfers · Branch Cases (if registered there or transferred there) · Room Board (if branch direct case got a room) · Treasury rollups · Daily Report · Admin Cases Master · Reception Room Board waiting count |
| `closeVisit` / `addSession` / `closeSession` (Clinic Case Detail) | Case Detail encounter timeline · My Cases status cell · Daily Report sessions today |
| `admit` / `discharge` (Branch Case Detail) | Inpatient panel · Room Board (discharge frees the Center Room) · Reception KPIs · Daily Report admitted/discharged |
| `receiveTransfer` / `assignRoom` (Incoming Transfer Detail) | Room Board (occupies the room) · Branch Cases · Reception KPIs · Admin alerts |
| `updateCase` (Incoming Transfer Detail "Confirm Receiving") | Financial type / Billing Facility / Excess / Treatment Mode propagate everywhere |
| `addExpense` (Clinic Treasury) | Cash currency card · Net Available · Daily Report expenses · Same-currency validation |
| `setHandoverDelivered` (Treasury) | Actual Delivered cell · Difference cell · Match/Over/Shortage status pill |
| `closeHandover` | Moves the period from Open Handover Statement → Closed Handovers history |
| `startNurseShift` / `endNurseShift` / `setDoctorOnDuty` | Attendance page · Daily Report attendance summary |

---

## 4. Full test URLs

Dev server is running locally:

```
npm run dev → http://localhost:5173
```

### External Clinic (switch identity in the top-right "Clinic" pill)
| Screen | URL |
|--------|-----|
| Dashboard | http://localhost:5173/design-preview/clinic/dashboard |
| **New Case** (with Encounter Pattern) | http://localhost:5173/design-preview/clinic/new-case |
| **My Cases** (table) | http://localhost:5173/design-preview/clinic/cases |
| **Case Detail** (example seed) | http://localhost:5173/design-preview/clinic/cases/r1_p2c_002 |
| **Transfers** (table) | http://localhost:5173/design-preview/clinic/transfers |
| **Treasury / Expenses / Handover** | http://localhost:5173/design-preview/clinic/treasury |
| Expenses (same page anchor) | http://localhost:5173/design-preview/clinic/expenses |
| **Attendance** | http://localhost:5173/design-preview/clinic/attendance |
| **Daily Report** | http://localhost:5173/design-preview/clinic/daily-report |

### Al-Kawther Branch
| Screen | URL |
|--------|-----|
| **Dashboard + Room Board** | http://localhost:5173/design-preview/reception/al-kawther/dashboard |
| **New Direct Case** (full intake + Inpatient + Room) | http://localhost:5173/design-preview/reception/al-kawther/new-case |
| **Incoming Transfers** (table) | http://localhost:5173/design-preview/reception/al-kawther/incoming-transfers |
| Received Transfer Detail (example) | http://localhost:5173/design-preview/reception/al-kawther/incoming-transfers/r1_p2c_003 |
| **Branch Cases** (table) | http://localhost:5173/design-preview/reception/al-kawther/cases |
| Case Detail (example) | http://localhost:5173/design-preview/reception/al-kawther/cases/r1_p2c_004 |
| **Treasury & Handover** | http://localhost:5173/design-preview/reception/al-kawther/treasury |
| **Daily Report** | http://localhost:5173/design-preview/reception/al-kawther/daily-report |

### Sheraton Branch (identical structure — `:branchSlug = sheraton`)
| Screen | URL |
|--------|-----|
| Dashboard | http://localhost:5173/design-preview/reception/sheraton/dashboard |
| New Direct Case | http://localhost:5173/design-preview/reception/sheraton/new-case |
| Incoming Transfers | http://localhost:5173/design-preview/reception/sheraton/incoming-transfers |
| Branch Cases | http://localhost:5173/design-preview/reception/sheraton/cases |
| Treasury | http://localhost:5173/design-preview/reception/sheraton/treasury |
| Daily Report | http://localhost:5173/design-preview/reception/sheraton/daily-report |

### Admin (oversight only — Invoice Manager remains protected placeholder)
| Screen | URL |
|--------|-----|
| Dashboard | http://localhost:5173/design-preview/admin-dashboard |
| All P2C Cases (extended with R2 fields) | http://localhost:5173/design-preview/admin/p2c-cases |
| **Reference Lists (Control Center concept)** | http://localhost:5173/design-preview/admin/reference-lists |
| Cases Master | http://localhost:5173/design-preview/admin/cases-master |
| Control Center | http://localhost:5173/design-preview/admin-control-center |
| Daily / Monthly Reports | http://localhost:5173/design-preview/admin/reports/daily · /monthly |

Demo role landing: http://localhost:5173/design-preview/demo-roles

---

## 5. Workflow verification results

Each of the 7 workflows in R2 spec §11 was exercised in the live preview:

### Workflow 1 — Insurance Single Visit + close
- Pick External Clinic · `+ New Case`.
- Encounter = **Outpatient — Single Visit**. Financial = Insurance, Facility = SMC.
- Submit → lands on Case Detail with `Active Visit · in HH:MM`.
- Click **Close Visit / Record Check-Out** → Case becomes Completed, status pill flips to `Visit closed HH:MM`.
- ✅ My Cases table row shows the new status immediately (verified).

### Workflow 2 — Insurance Multiple Sessions
- Encounter = **Outpatient — Multiple Visits / Sessions**. Insurance/SMC.
- Submit → Case Detail shows Sessions table with "Visit 1 · Active".
- Type a note + **Add New Visit / Session** → table grows to "Visit 2 · Active".
- Close Visit 1 → table flips to "1 Completed · 1 Active".
- ✅ My Cases shows summary like `2 Sessions · 1 Completed · 1 Active` (verified live).

### Workflow 3 — Cash split (Cash + Visa with editable FX)
- New Case, Financial = Cash, Invoice EUR 200.
- Payment Line 1: Cash EUR 100.
- Payment Line 2: change Method to Visa / Card → Actual Currency auto-locks to EGP. Type Foreign Amount Covered = EUR 100 and FX Rate = 62 (user input, no default).
- ✅ Treasury EUR cash + EGP Visa/Bank update independently. Verified the FX field starts BLANK with no `62.00` pre-fill.

### Workflow 4 — Insurance with Patient Excess
- New Case, Financial = Insurance/SMC, Patient Excess = Yes, Amount EUR 100.
- Excess Line 1: Cash EUR 50.
- Excess Line 2: Visa / Card → EGP, type FX rate manually.
- ✅ Treasury "Patient Excess Collections" rises separately from "Cash Invoice Collections" in the EUR card. Visa goes to bank movements.

### Workflow 5 — Expense + Handover
- Treasury · Record Expense → currency EGP, amount 200, Paid From = Physical Cash Balance → accepted, EGP cash balance drops.
- Try with Paid From = "Visa / Bank — try (will fail)" → rejection banner uses Mohamed's exact phrasing.
- Try with amount > available → same rejection.
- Open Handover Statement → Actual Delivered cells are **empty**. Type values for each row → Difference + Match/Over/Shortage auto-compute (verified: Match · مطابق · 0; Shortage · عجز 5 in EUR; Over · زياده 25 in EGP Visa/Bank).
- **Close & Confirm Handover** → period moves to Closed Handovers history.

### Workflow 6 — Transfer with Hotel Room preserved + Center Room
- New Case · Route = Transfer to Al-Kawther Branch · Hotel Room = 317 · submit.
- Switch to Al-Kawther Reception · Incoming Transfers → row appears in table with Hotel/317 visible.
- Open Detail → Original Registration pane preserves Hotel 317, Receiving pane allows Center Room pick (Available rooms only).
- Confirm → Demo State assigns the room, Room Board occupies that room with both Hotel + Center info.

### Workflow 7 — Inpatient admission / discharge
- Al-Kawther Direct Case · Encounter = Inpatient Admission · pick Available Room · submit.
- Room Board now shows the room **Occupied**, Reception KPIs increment Occupied/decrement Available.
- Open the Case Detail → click **Discharge Patient**.
- ✅ Verified live: Room 07 went from "Demo Patient Delta · INSURANCE · HMC · Inpatient · Surgical" back to "AVAILABLE · Empty — ready to assign"; KPIs went 5→4 Occupied, 10→11 Available.

---

## 6. Exact operational rules confirmed

- ✅ **Encounter Pattern is independent** of Route / Financial Type / Treatment Mode — separate `encounterPattern` field with `Outpatient — Single Visit · Outpatient — Multiple Visits/Sessions · Inpatient Admission`.
- ✅ **HMC / SMC selectable by operational user for Insurance** — required selector at New Case (clinic + branch) AND at Incoming Transfer Detail step 3.
- ✅ **Visa/Card actual settlement currency is EGP only** — `actualCurrency` auto-locks to EGP whenever `method === 'Visa / Card'`; the dropdown shows "(locked)" hint.
- ✅ **FX is editable per line and no fixed default exchange rate exists** — FX Rate field starts with empty placeholder "enter rate" and "EGP per 1 unit of foreign currency" hint. The legacy hardcoded `62.00` is gone from the runtime path (only appears as legacy seed metadata on R1 case excess lines for parity; new cases start blank).
- ✅ **Physical cash and Visa/Bank movements are separated** — separate cards, separate handover rows; Visa/Bank labelled "Not Cash · Cannot Pay Expenses".
- ✅ **External clinic expenses are deductible only from same-currency physical cash** — validator rejects Visa/Bank funding AND amounts exceeding available physical cash in that currency.
- ✅ **Hotel Room and Center Room both remain visible for transfers** — Hotel field on every patient + dedicated `hotelRoom`; Center Room is a separate `centerRoomNumber` field; both displayed side-by-side on Room Board cards, Branch Cases table, Case Detail, Receiving panel, Admin Master.
- ✅ **Conservative/Surgical are classification only — no billing automation** — Treatment Mode is a pure UI label set at New Direct Case or at Incoming Transfer Detail step 4. No invoice generation, no PDF engines, no billing engine interaction.
- ✅ **Actual Delivered must start empty + show Match/Over/Shortage** (Mohamed's Arabic note) — handover row `actualDelivered` is `null` on open periods; user types at handover time; Difference auto-computes; Match · مطابق (0), Over · زياده (+), Shortage · عجز (−).

---

## 7. Responsive QA results

- Verified at **1440 × 900 desktop** and **375 × 812 mobile** via the Claude Preview MCP.
- Desktop:
  - New Case + Direct Case forms use a 12-column grid with Tourist / Travel | Identity | Location & Contact side-by-side.
  - All major listings (My Cases, Transfers, Incoming Transfers, Branch Cases) are full-width operational tables, not cards.
  - Payment-line grid uses 24-col with `method` narrow, `Foreign Amount`, `FX Rate`, `Actual Amount` wider — Mohamed's specific complaint about cramped fields addressed.
  - Room Board grids stay 5-across on lg.
- Mobile:
  - Tables collapse to compact two-line rows.
  - Encounter cards stack 1-col.
  - Bottom nav (5 items) preserved for clinic (`Home / + New Case / My Cases / Treasury / Daily`) and reception (`Home / + Direct / Incoming / Rooms / Treasury`).
  - No horizontal overflow.

Production build clean: `npm run build` → ✓ built in 4.03s, 1669 modules transformed, 0 errors.

---

## 8. Safety scan results

- ✅ Public baseline `6a64b16` snapshot folder unchanged (197 files).
- ✅ Pre-R1 and Pre-R2 snapshots both present.
- ✅ No `git push`, no `gh pr`, no public deployment.
- ✅ No Supabase / Auth / SQL / RLS / backend / Master Sheet / OneDrive / Invoice Manager / billing-engine code touched. Only string matches for "supabase" are the reassurance copy on the demo landing page.
- ✅ No localStorage / sessionStorage / cookies / IndexedDB / fetch calls anywhere in the demo source.
- ✅ All cases, staff, hotels, insurers, refs use clearly-fake DEMO names. Patient names start "Demo …", refs are `DEMO-P2C-R1-*` or `DEMO-P2C-R2-*`, insurers prefixed `Demo …`.
- ✅ Every workspace page renders the "Interactive Demo / DEMO DATA" banner.

---

## 9. Remaining items awaiting Mohamed's approval before any deployment

These are deliberately left out of R2 per the STOP condition (spec §22):

- ❌ Backend (Supabase / Auth / SQL / RLS) — not started.
- ❌ Real patient / staff / insurer / financial data — none used.
- ❌ Real Master Sheet / OneDrive integration — none touched.
- ❌ Invoice Manager — remains protected placeholder.
- ❌ Billing engine / PDF generation — not touched. HMC + SMC billing skill folders not even read this session.
- ❌ Multi-nurse handover acknowledgement flow (operational nicety).
- ❌ Future audit history for billing-facility overrides (admin-side).
- ❌ Multi-tenant configurability of room counts, payment methods, currencies, insurer master list (the Reference Lists page is a read-only UI concept of where this will live).

---

## 10. Recommended click-path for Mohamed's review

1. Open http://localhost:5173/design-preview/demo-roles → pick **External Clinic** (Tropitel default).
2. **+ New Case**: try each Encounter Pattern. With Insurance + Multi-Session, submit and see Case Detail with Visit 1 active.
3. **Add a second session**, then **Close Visit 1** → status flips live.
4. Back to **My Cases** (via sidebar) — your case appears at top with encounter summary `2 Sessions · 1 Completed · 1 Active`.
5. **Treasury**: try Record Expense — both rejection paths (Visa/Bank, over-balance) and the valid path. Then open the Open Handover Statement — type Actual Delivered values in each row to see Match / Over / Shortage.
6. **Attendance** — start a nurse shift, end one, pick Doctor on Duty. Visit **Daily Report** — the attendance summary updates live.
7. **Transfers** — register a transfer case, then switch to **Al-Kawther Reception** → Incoming Transfers → open the transfer → confirm Receiving + assign a Center Room.
8. Open **Case Detail** for an inpatient (e.g., Room 07 Demo Patient Delta) → Discharge → see the room released on the dashboard.
9. Switch to **Sheraton Reception** — verify the same workflows work for the second branch.
10. Switch to **Admin** → All P2C Cases → see Hotel/Room, Center Room, Encounter, Treatment columns. Open **Reference Lists** under Control Center.

Refresh the browser at any point to reset everything back to the R1 seed.

---

Generated locally for `D:\Claude Code Engine\hmc-smc-portal-ui-demo\`. No backend, no upload, no GitHub.
