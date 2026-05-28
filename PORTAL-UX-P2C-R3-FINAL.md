# PORTAL-UX-P2C.R3 — External Clinic Desktop Operational Redesign & Workflow Accuracy Pass

**Sprint:** External Clinic Desktop Operational Redesign + Reference/Collections/Handover/Attendance/Print Fixes + Responsive Foundation
**Date:** 2026-05-27
**Scope:** Local UI/UX/interactive demo state only — no backend, no deployment, no GitHub push, no Supabase, no Master Sheet, no Invoice Manager, no PDF engines, no real patient data.
**Status:** Ready for Mohamed's local review. **STOP** — awaiting explicit approval before any deployment work.

---

## 1. Snapshot

| Asset | Status |
|------|--------|
| `snapshot/pre-P2C.R3-desktop-operational-redesign/` | ✅ Created before any edits (106 files, robocopy). |
| Public baseline `..._P2B2_AEGIS_BASELINE_6a64b16` | ✅ Unchanged. |
| Pre-R1, pre-R2 snapshots | ✅ Preserved. |
| `git push` / `gh pr` / Pages deploy | ❌ Not executed. |

---

## 2. Files changed

| File | Kind | Purpose |
|------|------|--------|
| `src/lib/ourRef.js` | **NEW** | Demo-runtime OUR Ref generator — HMC2026XXXXX and SHMC-DDMYYYY.NNN families, non-duplication scan against current case list. |
| `src/lib/displayDate.js` | **NEW** | DD.MM.YYYY / DD.MM.YYYY — HH:mm helpers; YMD shift/parse; long label. |
| `src/premium/LockedRefField.jsx` | **NEW** | Reusable locked, read-only OUR Ref display with lock icon, family chip, and demo disclaimer. |
| `src/premium/PaymentLines.jsx` | Rewritten | Visa/Card Actual Collected EGP auto-computes live (`foreign × FX rate`) and is read-only. Cash mirror locked. No fixed FX default. |
| `src/premium/OperationalShell.jsx` | Updated | Removed standalone "Expenses" item from clinic nav. |
| `src/context/DemoStateContext.jsx` | Updated | Added `useNextOurRef`, `useVisaTransactionsFor`, `confirmedVisaLineIds` state slice, `VISA_TX_CONFIRM`/`VISA_TX_UNCONFIRM` actions; reworked `useVisaBankFor` so pending/confirmed counts follow per-transaction state. |
| `src/index.css` | Updated | `@media print` rules — hide nav/sidebar/mobile bottom nav/action buttons/form controls; A4 page setup; reset card shadows and ink color for clean print. |
| `src/App.jsx` | Updated | `/design-preview/clinic/expenses` now redirects to `/design-preview/clinic/treasury` (legacy URL kept alive but non-functional as a standalone page). |
| `src/pages/preview/p2c/clinic/ClinicDashboardP2C.jsx` | **Rewritten** | Wide desktop redesign: date selector header (prev/next/today, DD.MM.YYYY), 5-tile Quick Actions row, 8-card KPI grid, 4-panel operational layout (Cases · Treasury · Attendance · Transfers). |
| `src/pages/preview/p2c/clinic/ClinicNewCaseP2C.jsx` | Updated | Locked OUR Ref panel at top, Travel section renamed to "Tourist Travel Dates — Egypt Arrival/Departure" with min/max + inline validation, editable Invoice Number replaced with locked Case/Invoice Reference (= OUR Ref), TODAY_DATE rendered via fmtDMY. |
| `src/pages/preview/p2c/clinic/ClinicTreasuryP2C.jsx` | **Rewritten** | Section A (Cash + Expenses + Cash Handover), Section B (Visa/Bank Summary + per-transaction table with Select-All + Confirm Selected Visa Handover + per-row Confirm), Section C (Closed handover history). DD.MM.YYYY — HH:mm period labels. |
| `src/pages/preview/p2c/clinic/ClinicAttendanceP2C.jsx` | **Rewritten** | Compact tables — Nurses (Date·Nurse·Start·End·Hours·Status·Action) and Doctor on Duty (Date·Doctor·Note·Action). Date selector (prev/next/today). Multiple nurses per day. |
| `src/pages/preview/p2c/reception/ReceptionNewCaseP2C.jsx` | Updated | Same R3 treatment as clinic New Case: locked OUR Ref, travel-date validation, locked Invoice/Case Reference. Branch direct case defaults to HMC family unless Insurance/SMC selected. |
| `src/pages/preview/p2c/reception/ReceptionTreasuryP2C.jsx` | Updated | Section A/B/C dividers, Visa transactions table, updated Visa summary tiles (Pending count + total · Confirmed count + total). DD.MM.YYYY — HH:mm period labels. |

---

## 3. Exact Mohamed-requirements → delivery map

| # | Mohamed asked | Where it landed |
|---|---|---|
| 1 | Dashboard wide desktop redesign | `ClinicDashboardP2C.jsx` — date selector + 5 quick actions + 8 KPIs + 4 panels (Cases / Treasury / Attendance / Transfers). |
| 2 | Dashboard filterable by selected date | Date selector with prev/next/Today; KPIs and Cases panel filter on `visitDate.slice(0,10) === dateYmd`. |
| 3 | Date label says Selected Date: DD.MM.YYYY | `Selected Date: 27.05.2026 · Wed · 27 May 2026` rendered in dashboard header. |
| 4 | Quick action: Register New Case prominent | Primary teal tile, ArrowRight icon, "Primary action" subtitle. |
| 5 | Travel dates clearly Egypt arrival/departure | Section title renamed to "Tourist Travel Dates — Egypt Arrival / Departure"; field labels "Arrival to Egypt Date" / "Departure from Egypt Date"; Plane icon hint pointing user back to Encounter for visit times. |
| 6 | Travel validation: arrival ≤ today, departure ≥ today | `arrivalAfterToday` / `departureBeforeToday` flags; HTML5 `max` / `min` attributes; inline `AlertTriangle` message; `canSubmit` blocks submit when invalid. |
| 7 | Locked sequential OUR Ref, no manual edit | `LockedRefField` rendered read-only (no `<input>`). Two families generated based on facility: `HMC2026XXXXX` (HMC) and `SHMC-DDMYYYY.NNN` (SMC, today = `SHMC-2752026.001`). |
| 8 | OUR Ref non-duplication in runtime | `generateOurRef` scans `cases.map(c => c.ourRef)` for the next free per-day or per-year sequence. |
| 9 | Honest disclaimer about demo vs production | Field hint: "Demo session only — production global sequencing comes from the backend later." |
| 10 | Replace editable Invoice Number | Both Clinic + Reception Cash blocks: editable input removed, replaced with `LockedRefField label="Case / Invoice Reference" value={nextRef.ref}`. `invoice.number` in submitted state = `nextRef.ref`. |
| 11 | Cash/Visa FX live auto-calculation | `PaymentLines.jsx` — Visa lines: `actualAmount = foreignAmount × fxRate`, read-only display with Lock icon, "ACTUAL COLLECTED EGP (AUTO)" label. Verified live: `100 × 62 → 6,200.00 EGP`. |
| 12 | FX rate starts BLANK | `blankLine()` returns `fxRate: ''`. Empty placeholder "enter rate". No fixed default anywhere. |
| 13 | Visa/Bank handover separated from cash | Treasury Section A = physical cash, Section B = Visa/Bank EGP transactions, Section C = History. Cash handover statement de-emphasises Visa rows ("see B" hint). |
| 14 | Visa per-transaction confirmation with count + total | `useVisaTransactionsFor` returns one row per Visa payment-line/excess-line. Table shows Select · Status · OUR Ref · Patient · Collection Type · Foreign Cur · Foreign Amt · FX Rate · Actual EGP · Action. Per-row Confirm + batch "Confirm Selected Visa Handover". |
| 15 | Summary updates after confirmation | `useVisaBankFor` recomputes `pendingCount`, `pendingTotal`, `confirmedCount`, `confirmedTotal` from `confirmedVisaLineIds` map on every dispatch. |
| 16 | Remove standalone Expenses nav | `OperationalShell.jsx` clinic nav now: Home · New Case · My Cases · Transfers · Treasury · Attendance · Daily (no Expenses). `/clinic/expenses` URL → `<Navigate replace>` to `/clinic/treasury`. |
| 17 | Attendance practical table redesign | `ClinicAttendanceP2C.jsx` — Nurses table (Date·Nurse·Start·End·Hours·Status·Action), Doctor on Duty table (Date·Doctor·Note·Action). Date selector controls which day is shown. |
| 18 | Multiple nurses per day | Reducer already supports it; UI shows all `shiftsOnDate` regardless of count. Verified: Demo Nurse Alia + Demo Nurse Bahy both visible. |
| 19 | Doctor day-only, no clock-in/out | Doctor on Duty table has no Start/End columns — Date·Doctor·Note·Action only. Assign via dropdown in Action cell. |
| 20 | Print CSS — hide mobile navigation | `@media print` block in `index.css`: hides `header`, `aside`, `nav`, `.no-print`, `[data-no-print]`, `.p-btn-primary`, `.p-btn-ghost`, all `input/select/textarea/button`, plus collapses `.sticky` and `.md\:hidden.fixed`. A4 page size. |
| 21 | Print uses clean A4 with readable tables | `@page { size: A4; margin: 12mm 10mm }`, `.p-card { box-shadow: none, border: 1px solid #CBD5E1, page-break-inside: avoid }`, table borders re-enabled, links un-styled. |
| 22 | Responsive desktop-first foundation | Dashboards use `max-w-[1500px]`, `lg:grid-cols-12`, 8-column KPI rows on lg. Mobile (375): sidebar hidden, bottom nav visible, no horizontal overflow (verified). Tables `overflow-x-auto` with `min-w-[…]`. |
| 23 | Branches inherit OUR Ref + Visa rules | Reception New Case + Reception Treasury extended with same `LockedRefField`, same Section A/B/C, same Visa transactions table. Branches default to HMC family. |
| 24 | Consistent date formatting | `lib/displayDate.js` — `fmtDMY` (27.05.2026), `fmtDMYHM` (27.05.2026 — 14:30), `fmtHM` (14:30), `fmtLongLabel` (Wed · 27 May 2026). Applied across Dashboard / Attendance / Treasury / New Case header / handover periods / expense `When` column. |

---

## 4. OUR Ref format & non-duplication

```js
// SMC family (external clinics, default + Insurance/SMC)
SHMC-{DDMYYYY}.{NNN}    e.g. SHMC-2752026.001  (27 May 2026, seq 001)

// HMC family (branch direct case, Insurance/HMC)
HMC{YYYY}{NNNNN}        e.g. HMC202630001      (year 2026, seq 30001)
```

- Family is decided by `pickRefFamily()` from `{ facility, registeredAtKind, registeredAtId, billingFacility }`.
- Existing refs scanned via `cases.map(c => c.ourRef)`. Next seq = `max + 1`, with a friendly floor (`Math.max(max + 1, 30001)` for HMC, `Math.max(max + 1, 1)` for SMC per-day).
- **Demo rule visible in the UI:** Auto-generated and non-duplicated **within this demo session**. Production global sequencing comes from the approved backend later. This is stated in the hint line on the locked field.
- No manually-typed Invoice Number anywhere — clinic + reception Cash blocks both use the locked OUR Ref for `invoice.number`.

---

## 5. Visa / Card auto-calc — worked example

```
Payment Method: Visa / Card
Foreign Currency: EUR
Foreign Amount Covered: 100
FX Rate Used: 62
→ Actual Collected EGP (auto, locked): 6,200.00 EGP
```

Verified live in the preview:
- Method dropdown switched to "Visa / Card" → Actual Currency snapped to EGP (locked).
- Typed Foreign Amount = 100, FX Rate = 62.
- Actual Collected EGP cell read **"6,200.00 EGP"** with green check-style background and Lock icon.
- Inline advisory text: "Visa / Card settles in **EGP only**. Type the Foreign Amount + FX Rate — the Actual Collected EGP is calculated automatically (locked)."

---

## 6. Visa / Bank handover — per-transaction worked example

Treasury Section B shows:
- **Pending Transactions count** / **Pending Total EGP** (live).
- **Confirmed Transactions count** / **Confirmed Total EGP** (live).
- Header bar: "N selected of M pending" + "Select All Pending" + "Confirm Selected Visa Handover" buttons.
- Per row: checkbox, status pill (Pending / Confirmed / Carry-Forward seed), OUR Ref, Patient, Collection Type, Invoice Currency, Foreign Amount, FX Rate, Actual EGP, plus a per-row "Confirm Handover" button.

Confirming a transaction dispatches `VISA_TX_CONFIRM` which flips that line's id in `state.confirmedVisaLineIds`. Both the summary tile count/total **and** the row status update on the next render — no page reload required.

---

## 7. Responsive QA

Verified directly via Preview MCP:

| Width | Result |
|------|--------|
| **1440 × 900 desktop** | Sidebar 240px + main 1190px. All 5 Quick Actions on a single row (top:268 for all). 8 KPI tiles in one grid row. 4 operational panels in 2-column layout (Cases lg-col-8 + Treasury lg-col-4 on top; Attendance + Transfers lg-col-6 each below). |
| **879 × 900 native desktop** | Sidebar still visible. KPI grid wraps to 2×4. Quick Actions wrap to 3+2. Tables overflow-x-auto inside cards. |
| **375 × 812 mobile** | Sidebar hidden, bottom mobile nav visible (5 items: Home / + New Case / My Cases / Treasury / Daily). `bodyW === docW (375)` — no horizontal overflow. All tables become horizontally scrollable. |

---

## 8. Print CSS — pages tested

The `@media print` rules apply globally via `src/index.css` and hide:

- `header` (top app bar with brand + DEMO chip)
- `aside` (desktop sidebar)
- `nav` (including the mobile bottom navigation)
- `.no-print` and `[data-no-print]` (per-element opt-out — used on action buttons in tables)
- `.p-btn-primary` / `.p-btn-ghost` (Buttons styled with these classes — Save Draft, End Shift, Confirm, etc.)
- All form controls (`input`, `select`, `textarea`, `button`)
- `.sticky` (collapses the bottom action bar on New Case forms)
- `.md\:hidden.fixed` (the mobile bottom nav specifically)

Page setup: `@page { size: A4; margin: 12mm 10mm }`. Tables get `1px solid #CBD5E1` borders, cards lose elevation, ink colour forced to `#111`.

Pages whose print output Mohamed can preview:

- `/design-preview/clinic/daily-report`
- `/design-preview/clinic/treasury` (cash currency cards + Visa transactions table + handover statement)
- `/design-preview/clinic/attendance` (nurse + doctor tables)
- `/design-preview/clinic/cases/<id>` (case detail)

Use Ctrl+P (or Cmd+P) in the browser to preview.

---

## 9. Build & runtime

```
> npm run build
✓ 1672 modules transformed
✓ built in 4.51s
0 errors
```

Dev server already running at `http://localhost:5173` (HMR confirmed via vite hot-update logs). No console errors during live verification.

---

## 10. Local URLs Mohamed should open

### External Clinic (switch identity in the top-right "Clinic" pill)
| Screen | URL |
|--------|-----|
| **Dashboard (redesigned wide desktop)** | http://localhost:5173/design-preview/clinic/dashboard |
| **New Case (locked OUR Ref + travel validation)** | http://localhost:5173/design-preview/clinic/new-case |
| My Cases (table) | http://localhost:5173/design-preview/clinic/cases |
| Case Detail | http://localhost:5173/design-preview/clinic/cases/r1_p2c_002 |
| Transfers (table) | http://localhost:5173/design-preview/clinic/transfers |
| **Treasury / Visa Handover (Section A / B / C)** | http://localhost:5173/design-preview/clinic/treasury |
| Legacy `/clinic/expenses` URL → redirects to Treasury | http://localhost:5173/design-preview/clinic/expenses |
| **Attendance (compact tables)** | http://localhost:5173/design-preview/clinic/attendance |
| Daily Report | http://localhost:5173/design-preview/clinic/daily-report |

### Al-Kawther & Sheraton branches (same R3 rules)
| Screen | URL |
|--------|-----|
| **Direct Case (locked OUR Ref, branch default = HMC)** | http://localhost:5173/design-preview/reception/al-kawther/new-case · /sheraton/new-case |
| **Treasury & Visa handover** | http://localhost:5173/design-preview/reception/al-kawther/treasury · /sheraton/treasury |

### Admin
| Screen | URL |
|--------|-----|
| All P2C Cases | http://localhost:5173/design-preview/admin/p2c-cases |
| Reference Lists | http://localhost:5173/design-preview/admin/reference-lists |

---

## 11. Interactive scenarios to exercise

**Scenario 1 — Dashboard Date Filter.**
Open `/clinic/dashboard`, click ◀ / ▶ — KPIs, Cases panel, Transfers panel all rerun against the selected date. Click **Today** to snap back.

**Scenario 2 — Locked OUR Ref.**
Open `/clinic/new-case`. The OUR Ref panel reads `SHMC-2752026.001` (locked) immediately. Click **Insurance** → pick **HMC** → the panel switches to `HMC202630001`. No keyboard focus lands on the value — it's read-only.

**Scenario 3 — Cash + Visa split with FX auto-calc.**
Same form, click **Cash**. Set Foreign Amount = 200 / FX blank → Visa line "Actual Collected EGP (auto)" shows "enter amount + rate" placeholder. Type FX Rate = 62 → shows **6,200.00 EGP** instantly (locked, can't type into it).

**Scenario 4 — Visa Handover transaction-by-transaction.**
Open `/clinic/treasury`, scroll to Section B. The transactions table shows pending Visa lines (seed + any from Scenario 3). Tick a few rows → header reads "N selected of M pending" → click **Confirm Selected Visa Handover** → status flips to **Confirmed**, summary tiles update count/total in real-time.

**Scenario 5 — Expense from Cash only.**
Section A.2 — try expense with **Paid From = Visa/Bank (will fail)** → red banner. Try amount > available EGP → red banner. Valid path → EGP physical cash decreases on the currency card. No standalone Expenses tab in the sidebar.

**Scenario 6 — Attendance compact tables.**
Open `/clinic/attendance`. Select a nurse → click **Start Shift** → row appears in the Nurses table with Status=ON SHIFT and Worked Hours ticking. Click **End Shift** in the row → Status flips to CLOSED. Assign Doctor in the per-row dropdown in the Doctor table.

**Scenario 7 — Print.**
On `/clinic/daily-report` or `/clinic/treasury`, press Ctrl+P. The top bar, sidebar, mobile bottom-nav, and action buttons all disappear. Tables print with borders on A4.

**Scenario 8 — Responsive.**
Resize the browser narrow → sidebar collapses → bottom mobile nav appears with 5 items. No horizontal page overflow.

---

## 12. Honest constraints stated in the UI

- **OUR Ref demo disclaimer** (visible on every form): "Auto-generated case identity — not editable. Unique within this demo session." + "Final irreversible global sequencing will be enforced by the backend later."
- **Visa/Bank** is labelled "Not Cash · Cannot Pay Expenses" (red badge) every time it's shown.
- **DemoBanner** still appears at the top of every workspace page reminding the user that "refresh resets all data."

---

## 13. What's deliberately out of scope (per the STOP condition)

| Item | Status |
|------|--------|
| GitHub push / Pages deploy | ❌ Not performed. |
| Supabase / Auth / SQL / RLS / backend | ❌ Not touched. |
| Real Master Sheet / OneDrive | ❌ Not touched. |
| Invoice Manager / PDF engines / billing engine | ❌ Not touched — the HMC + SMC skill folders not even opened this sprint. |
| Locked HMC/SMC PDF generator source | ❌ Not modified. |
| Final global OUR Ref sequencing | ❌ Demo only — backend-future. |
| Cross-branch Treasury reconciliation roll-up at admin | ❌ Untouched (out of scope). |
| Multi-tenant configurability (insurer master list, room counts) | ❌ Reference Lists page is still a read-only concept (R2). |

---

## 14. Mandatory final stop

**STOP.**

- Do not push.
- Do not deploy.
- Do not modify the public GitHub Pages baseline.
- Wait for Mohamed's review of the P2C.R3 local desktop workflow.

Generated locally for `D:\Claude Code Engine\hmc-smc-portal-ui-demo\`. No backend, no upload, no GitHub.
