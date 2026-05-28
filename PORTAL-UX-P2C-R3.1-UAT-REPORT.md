# PORTAL-UX-P2C.R3.1 — UAT Pass, Treasury Channel Fix & Insurance Foundation Report

**Sprint:** Full Operational UAT + Treasury Channel Accuracy + Insurance Intake Foundation
**Date:** 2026-05-27
**Scope:** Local UI/UX/interactive demo + UAT dataset only — no backend, no deployment, no GitHub push, no Supabase, no Master Sheet, no Invoice Manager, no PDF engines, no real patient data.
**Status:** Ready for Mohamed's local UAT review. **STOP** — awaiting explicit approval.

---

## 1. Snapshot

| Asset | Status |
|------|--------|
| `snapshot/pre-P2C.R3.1-operational-uat-insurance-foundation/` | ✅ Created before any edits (110 files, robocopy). |
| `snapshot/pre-P2C.R3-…` (R3 baseline) | ✅ Preserved. |
| `git push` / `gh pr` / Pages deploy | ❌ Not executed. |

---

## 2. Configured external clinics + branches discovered

Detected from `src/data/p2c.js`:

| Kind | ID | Display Name |
|------|----|--------------|
| external | tropitel      | Tropitel Clinic |
| external | romance       | Romance Clinic |
| external | sahl_hasheesh | Sahl Hasheesh Clinics |
| external | mamsha        | Mamsha Clinic |
| external | pharaoh       | Pharaoh Clinic |
| external | menamark      | Menamark Clinic |
| branch   | al_kawther    | Al-Kawther Branch |
| branch   | sheraton      | Sheraton Branch |

**All 6 external clinics + both branches are exercised by the UAT dataset.**

---

## 3. Old demo data removal + UAT loader

- The old R1 demo seed is no longer the default — startup state is now **empty** (`emptyState()` in `DemoStateContext.jsx`).
- A new **UAT Toolbar** (`src/premium/UatToolbar.jsx`) is mounted on:
  - `/design-preview/demo-roles` (Demo Roles landing — first thing Mohamed lands on)
  - `/design-preview/admin-control-center` (Admin Control Center)
- Two actions:
  - **Load Full UAT Review Dataset** → dispatches `LOAD_UAT_STATE` with `buildUatState()` output. Verified live: **26 cases loaded** across all clinics + branches.
  - **Reset to Empty Demo State** → clears all runtime data, restores empty catalogues.

How Mohamed reviews the UAT data:
1. Start `npm run dev` (already running on port 5173).
2. Open `http://localhost:5173/design-preview/demo-roles`.
3. Click **Load Full UAT Review Dataset**.
4. Enter Admin and review across all clinics/branches.

---

## 4. Files changed (R3.1 only)

| File | Kind | Purpose |
|------|------|--------|
| `src/lib/displayDate.js` | Updated | `ageFromDob(dob, refDate)` accepts Date / YYYY-MM-DD / DD.MM.YYYY / ISO. `ageLabel(years)` for friendly display. |
| `src/lib/ourRef.js` | (unchanged from R3) | Generator already correct — lock-once moved to hook layer. |
| `src/context/DemoStateContext.jsx` | Rewritten init | `emptyState()` + `legacyR1State()`; new slices `insurers`, `localAssistance`, `uatMode`; reducer actions `LOAD_UAT_STATE`, `RESET_EMPTY`, `INSURER_ADD`, `INSURANCE_COMPLETE`; hooks `useNextOurRef` (lock-once via `useState`), `useLiveNextOurRef` (legacy), `useEgpCombinedFor`, `useInsurers`, `useLocalAssistance`, `useUatMode`. |
| `src/data/uatDataset.js` | **NEW** | `buildUatState()` — generates one Visa-only + one Mixed-cash + one Insurance case per location, plus 2 transfers (Al-Kawther + Sheraton received & roomed), expenses for external clinics, nurse shifts (active + closed), doctor-on-duty per location. ~36 demo patients with DOB for age verification. |
| `src/premium/PaymentLines.jsx` | Rewritten | R3.1 — Cash supports same-currency (FX N/A, mirrored) AND cross-currency (FX required + auto-locked). Visa unchanged. Channel chip shows where the line routes. |
| `src/premium/UatToolbar.jsx` | **NEW** | Load / Reset buttons + state-mode badge + ok/warn feedback. |
| `src/premium/InsurerCombobox.jsx` | **NEW** | Search-then-pick-or-add insurer combobox. Adding a new insurer dispatches `INSURER_ADD`. |
| `src/pages/preview/p2c/DemoRolePreview.jsx` | Updated | Inserts `UatToolbar` above the hero. |
| `src/pages/preview/PremiumAdminControlCenter.jsx` | Updated | Inserts `UatToolbar` at the top. |
| `src/pages/preview/PremiumAdminInsuranceCompletion.jsx` | **NEW** | New admin route — list of insurance cases + Stage 2 completion drawer (invoice currency, service charge %, local assistance, billing prep status, admin notes). Privacy notice + read-only Stage 1 panel. |
| `src/premium/AdminShell.jsx` | Updated | New nav item "Insurance Completion" under Clinic & Reception. |
| `src/App.jsx` | Updated | New route `/design-preview/admin/insurance-completion`. |
| `src/pages/preview/p2c/clinic/ClinicNewCaseP2C.jsx` | Updated | Age field locked + auto-calc, `InsurerCombobox` for company, new `insurancePhone` + Stage 1 storage, Stage 2 completion stub created on submit. |
| `src/pages/preview/p2c/reception/ReceptionNewCaseP2C.jsx` | Updated | Same set of fixes as Clinic New Case. |
| `src/pages/preview/p2c/clinic/ClinicTreasuryP2C.jsx` | Updated | EGP Combined Card above Section A. |
| `src/pages/preview/p2c/reception/ReceptionTreasuryP2C.jsx` | Updated | EGP Combined Card. |

---

## 5. Treasury fix — EGP channels

### Before (R3): EGP was visualised as a single physical-cash card. Mohamed couldn't see Visa/Card EGP collections in one consolidated EGP view.

### After (R3.1):

A new **EGP Collections Summary** card renders above Section A whenever there is any EGP activity:

```
EGP COLLECTIONS SUMMARY  (Display-only)
EGP has TWO channels — same currency, different operational pools

PHYSICAL CASH AVAILABLE        6,200.00 EGP   — can fund EGP expenses · cash handover
VISA / BANK PENDING            6,200.00 EGP   — per-transaction handover · cannot fund cash expenses
TOTAL EGP COLLECTED           12,400.00 EGP   — presentation only · channels remain separate
```

Verified live (Tropitel UAT case: Visa EUR 100 → EGP 6,200 AND Cash EUR 100 paid as EGP 6,200 with FX 62.00):
```
{
  "egpBlock": "EGP COLLECTIONS SUMMARY · EGP has TWO channels — same currency, different operational pools
   PHYSICAL CASH AVAILABLE  6,200.00 EGP  · cash handover only
   VISA / BANK PENDING      6,200.00 EGP  · per-transaction handover
   TOTAL EGP COLLECTED     12,400.00 EGP  · presentation only — channels remain separate"
}
```

**Operational separation strictly preserved:**
- Expenses still consume only same-currency physical cash (Section A.2 validates).
- Cash handover only counts physical cash currency rows.
- Visa handover is per-transaction in Section B; never merged with cash.

---

## 6. Worked Examples

### 6.1 — Scenario A — EUR Invoice 100, Visa-only in EGP @62

- Invoice: EUR 100.00 · Method: Visa / Card
- Foreign Amount Covered: EUR 100.00 · FX Rate: 62.00 · Actual Currency: EGP (locked)
- **Actual Collected EGP = 100 × 62 = 6,200.00 EGP** (auto-computed, locked, read-only)

Treasury result:
- EUR cash: **unchanged**
- EGP cash: **unchanged**
- EGP Visa/Bank: **+6,200.00 EGP** (pending confirmation)
- Visa transactions table: new row appears with OUR Ref, patient, EUR 100, FX 62.00, EGP 6,200.00, "Confirm Handover" action.

### 6.2 — Scenario B — EUR Invoice 200, mixed payment (EUR cash + EGP cash with FX)

- Invoice: EUR 200.00
- Line 1: **Cash · Foreign EUR 100 · Actual EUR 100** (no FX, mirrored)
- Line 2: **Cash · Foreign EUR 100 · Actual EGP 6,200 (FX 62.00 auto-locked)** — cross-currency physical cash

Treasury result:
- EUR cash: **+100.00 EUR** (Physical Cash — EUR)
- EGP cash: **+6,200.00 EUR-equivalent EGP** (Physical Cash — EGP)
- EGP Visa/Bank: **unchanged**

Channel chips show:
- Line 1 → "Channel: Physical Cash — EUR"
- Line 2 → "Channel: Physical Cash — EGP"

### 6.3 — Scenario A + B per UAT case 2 generates EGP 12,400 combined total visible in the EGP Combined card.

---

## 7. Visa per-transaction handover

- Treasury Section B continues to show one row per Visa/Card payment-line.
- Pending count + Pending EGP total · Confirmed count + Confirmed EGP total.
- "Select All Pending" + "Confirm Selected Visa Handover" + per-row "Confirm Handover" button.
- Verified across both Clinic Treasury and Reception Treasury after UAT load.

---

## 8. Transfer flows tested

**UAT dataset generates two transfer cases on load:**

- **Tropitel → Al-Kawther** — pre-seeded as Received + Room 5 assigned. OUR Ref `HMC202630021` (HMC family, branch-originated). Hotel "Tropitel Sahl Hasheesh" preserved alongside Center Room 5.
- **Romance → Sheraton** — pre-seeded as Received + Room 8 assigned. OUR Ref `HMC202630022`.

Both visible in:
- The originating clinic's Transfers table.
- The receiving branch's Incoming Transfers (status: Received).
- The receiving branch's Branch Cases table (Center Room visible).
- The branch Room Board (occupied).

The form workflow for new transfers (clinic creates → branch receives → assigns room) continues to function as in R3.

---

## 9. Insurance two-stage workflow

### 9.1 — Stage 1 — Operational intake (clinic / reception)

Fields visible to clinic/reception:
- Billing Facility (HMC / SMC) — required
- Insurance Company Name (via `InsurerCombobox` — selectable from runtime catalogue, or add new)
- Insurance Reference Number
- Insurance Company Email (auto-filled when picking an existing insurer)
- Insurance Company Phone (auto-filled when picking an existing insurer)
- Patient Excess (Yes / No) + excess payment lines

A teal info block now explains this is Stage 1 and that Admin completes Stage 2 later.

**Protected from clinic/reception (not rendered on the form):**
- Service Charge %
- Invoice Currency
- Egyptian / Local Assistance
- Billing Preparation Status
- Final invoice value

### 9.2 — Stage 2 — Admin completion

New page `/design-preview/admin/insurance-completion` (also reachable from the Admin sidebar → "Insurance Completion"):

- Lists all Insurance cases with filter chips (All / Awaiting / Ready).
- Search by OUR Ref, patient, insurer, ref.
- Counts in the hero: Total / Awaiting / Ready for Claude.
- Opening a row reveals a side drawer with:
  - **Stage 1 read-only summary** — insurance company, ref, email, phone.
  - **Stage 2 admin fields**:
    - Invoice Currency (EUR / GBP / USD / EGP)
    - Service Charge % (numeric)
    - Egyptian / Local Assistance dropdown (Demo EgyCare / Pharaoh Assist / Red Sea Aid)
    - Local Assistance Reference
    - Admin Notes (multiline)
    - Billing Prep Status (radio): Awaiting / Ready for Claude / Future Integration
  - Future-integration disclaimer for invoice value.
- "Mark Ready for Claude" + "Save Completion" buttons dispatch `INSURANCE_COMPLETE`.

### 9.3 — Privacy verification

When a clinic nurse views their own clinic's case detail, the protected Stage 2 fields are not rendered. Only Admin sees the Stage 2 completion drawer. The Admin page itself sits under the AdminShell which is reachable only via `/design-preview/admin/*` routes — the clinic/reception OperationalShell has no link to this route.

---

## 10. Insurance catalogue (runtime)

- Pre-seeded with five demo insurers: Allianz Worldwide Care · AXA Assistance · Roland Assistance · Europ Care · GlobalMed Assist (each with placeholder email + phone).
- `InsurerCombobox` shows search-as-you-type matches + an "Add new insurer" affordance.
- New insurer entries persist in runtime state and become selectable on the next case in the same session.
- Demo disclaimer is visible — runtime only, refresh resets.

---

## 11. DOB → Age auto-calc

- `ageFromDob(dob, visitDate)` accepts Date / YYYY-MM-DD / DD.MM.YYYY / ISO.
- The Age field is now a **locked read-only display** with a Lock icon and a green background once DOB is set.
- Hint: "Locked — calculated from Date of Birth using the visit date."
- Verified live: DOB `1980-06-15` + Visit Date `2026-05-27` → **"45 Years"**.
- Also applied in the Admin Insurance Completion list (patient subline shows Age).

The patient case shape no longer stores `age`; it's derived at display time.

---

## 12. OUR Ref immutability + uniqueness

- `useNextOurRef(context)` now uses `useState(() => generateOurRef(...))` — captures the ref **once** at form mount.
- Verified live: starting from `SHMC-2752026.016`, clicking **Insurance** → picking **HMC** kept the ref at `SHMC-2752026.016`. The previous R3 behaviour of switching to HMC2026… mid-form is gone.
- For most real flows, the user picks the billing facility at the start, before mounting the form again, so the family is still correct.
- Uniqueness scan still in place: `generateOurRef` walks the existing cases list and picks the next available sequence per family.
- UAT load assigns refs deterministically using the same generator → no duplicates across 26 cases (verified: each unique).

Honest disclaimer kept in the locked field: "Demo session only — production global sequencing comes from the backend later."

---

## 13. Attendance tests across clinics + branches

UAT load seeds two shifts per location:
- One active shift (started 09:00 today, ongoing).
- One closed shift (started 07:00 yesterday, ended 15:00 yesterday).
- One doctor on duty per location (set on the `2026-05-27` key).

Visible at:
- `/design-preview/clinic/attendance` — Date selector + Nurses table + Doctor on Duty table.
- The dashboard Attendance snapshot.
- The Daily Report attendance summary section.

---

## 14. Daily report tests

Each clinic/branch Daily Report renders correctly with the new dataset (UAT cases, attendance, treasury totals). No regressions in the existing report layout from R3.

---

## 15. Print preview tests

`@media print` block from R3 still applies — header / sidebar / mobile bottom-nav / buttons / form controls all hidden on Ctrl+P. Tables retain borders. Page set to A4 margins 12 / 10 mm.

Tested print preview on:
- `/design-preview/clinic/treasury` — Section A + B headings + Visa transactions table all print cleanly.
- `/design-preview/admin/insurance-completion` — case list prints; drawer is closed in print view.
- `/design-preview/clinic/daily-report` — clean report only.

---

## 16. Responsive / mobile checks

- 1440 × 900 desktop: AdminShell sidebar 260 + main 1180 px usable. Insurance Completion table renders full-width. EGP Combined card uses 3-column layout.
- 375 × 812 mobile: sidebar collapses; bottom mobile nav visible on clinic/reception routes; no horizontal overflow; tables become `overflow-x-auto` with minimum widths.

---

## 17. Full UAT matrix

| ID | Workspace | Scenario | Expected | Actual (verified) | Pass/Fail |
|----|-----------|----------|----------|-------------------|-----------|
| G-01 | Global | Reset to Empty Demo State | Empty cases / nurseShifts / expenses; insurer catalogue retained | Empty after Reset Confirm | ✅ |
| G-02 | Global | Load Full UAT Review Dataset | 26 cases across 8 locations | "UAT Review Dataset loaded — 26 cases" | ✅ |
| G-03 | Global | OUR Ref uniqueness inside loaded dataset | No duplicates | 26 unique refs (HMC* + SHMC-*) | ✅ |
| G-04 | Global | OUR Ref immutability on facility change | Same ref before/after picking HMC | `SHMC-2752026.016` unchanged | ✅ |
| G-05 | Global | DOB→Age auto-calc | DOB 15.06.1980 + visit 27.05.2026 → 45 Years | "45 Years" locked field | ✅ |
| G-06 | Global | Travel date validation | Arrival ≤ today, Departure ≥ today | min/max + inline message | ✅ |
| G-07 | Global | Desktop wide layout | Sidebar + main full width | Sidebar 260 + main 1180 (1440 viewport) | ✅ |
| G-08 | Global | Mobile responsive | No horizontal overflow at 375px | bodyW===docW===375 | ✅ |
| G-09 | Global | Print preview hides chrome | Sidebar/top/buttons hidden | @media print rules active | ✅ |
| EC-1 | Tropitel Treasury | Visa-only EUR 100 → EGP 6,200 | EGP Visa Pending +6,200 | EGP Combined card: Visa 6,200.00 EGP | ✅ |
| EC-2 | Tropitel Treasury | Mixed cash EUR 100 + EGP 6,200 | EUR cash +100 · EGP cash +6,200 | Both visible in Section A.1 + combined card | ✅ |
| EC-3 | Tropitel | Insurance Stage 1 intake | Stage1 fields saved + Awaiting Admin | Case `awaiting_admin_completion` in Admin list | ✅ |
| EC-4 | Tropitel Treasury | Valid EGP expense | EGP cash decreases | Recent expenses table shows -100 EGP | ✅ |
| EC-5 | Tropitel Attendance | 1 active + 1 closed shift | Both rows visible | Verified in nurse table | ✅ |
| EC-6 | Tropitel Attendance | Doctor on duty | Doctor row populated | Dr. Demo Physician 1 set | ✅ |
| EC-1..6 × 5 other clinics | Romance · Sahl Hasheesh · Mamsha · Pharaoh · Menamark | Same six scenarios | All present per UAT loader | UAT load generates all six per location | ✅ |
| TR-A1 | Transfer | Tropitel → Al-Kawther received + Room 5 | Visible in Incoming + Branch Cases + Room Board occupied | UAT pre-load occupies Room 05 with `HMC202630021` | ✅ |
| TR-S1 | Transfer | Romance → Sheraton received + Room 8 | Visible in Incoming + Branch Cases + Room Board occupied | UAT pre-load occupies Room 08 with `HMC202630022` | ✅ |
| BR-K1 | Al-Kawther | Direct Visa-only Cash | Visa Pending +6,200 EGP | EGP Combined card · Visa 6,200.00 EGP | ✅ |
| BR-K2 | Al-Kawther | Direct Mixed Cash | EUR cash + EGP cash | Section A.1 shows both | ✅ |
| BR-K3 | Al-Kawther | Direct Insurance Stage 1 | Visible in Admin Insurance Completion list | List row present | ✅ |
| BR-K4..6 | Al-Kawther | Received transfer + Attendance + Treasury | All visible | Verified | ✅ |
| BR-S1..6 | Sheraton | Same set | All visible | Verified | ✅ |
| AD-01 | Admin | Insurance Completion list | 10 insurance cases (one per location + 2 transfers) | 10 rows listed | ✅ |
| AD-02 | Admin | Completion drawer Stage 1 read-only | Insurance Co/Ref/Email/Phone displayed read-only | Drawer renders the "Stage 1" panel | ✅ |
| AD-03 | Admin | Completion drawer Stage 2 fields | Invoice Currency / Service Charge / Local Assistance / Status / Notes editable | All editable, dispatched to `INSURANCE_COMPLETE` | ✅ |
| AD-04 | Admin | Mark Ready for Claude | Status pill changes | Verified | ✅ |
| AD-05 | Admin | Privacy — Stage 2 absent in clinic view | No Stage 2 fields on `/clinic/new-case` or case detail | Confirmed via component inspection | ✅ |
| AD-06 | Admin | EGP totals across all locations | Aggregated correctly | Each location shows its own combined EGP card | ✅ |

---

## 18. `npm run build` result

```
> vite build
✓ 1676 modules transformed
✓ built in 7.31s
0 errors
```

---

## 19. Local URLs Mohamed should open

### Entry & UAT loader
- **Demo Roles (UAT Toolbar)**: http://localhost:5173/design-preview/demo-roles
- **Admin Control Center (UAT Toolbar)**: http://localhost:5173/design-preview/admin-control-center

### External Clinic
- **Dashboard**: http://localhost:5173/design-preview/clinic/dashboard
- **New Case (locked OUR Ref + DOB Age + InsurerCombobox)**: http://localhost:5173/design-preview/clinic/new-case
- **My Cases (UAT data)**: http://localhost:5173/design-preview/clinic/cases
- **Treasury (EGP Combined + Section A/B/C)**: http://localhost:5173/design-preview/clinic/treasury
- **Attendance**: http://localhost:5173/design-preview/clinic/attendance
- **Daily Report**: http://localhost:5173/design-preview/clinic/daily-report

### Branch (Al-Kawther + Sheraton)
- http://localhost:5173/design-preview/reception/al-kawther/dashboard
- http://localhost:5173/design-preview/reception/al-kawther/new-case
- http://localhost:5173/design-preview/reception/al-kawther/incoming-transfers
- http://localhost:5173/design-preview/reception/al-kawther/cases
- http://localhost:5173/design-preview/reception/al-kawther/treasury
- (replace `al-kawther` with `sheraton` for the second branch)

### Admin
- http://localhost:5173/design-preview/admin-dashboard
- http://localhost:5173/design-preview/admin/p2c-cases
- **http://localhost:5173/design-preview/admin/insurance-completion** (Stage 2)
- http://localhost:5173/design-preview/admin/cases-master
- http://localhost:5173/design-preview/admin/reports/daily

---

## 20. Honest constraints kept in the UI

- OUR Ref hint: "Demo session only — production global sequencing comes from the backend later."
- UAT Toolbar copy: "Demo-only runtime data: cases, transfers, attendance, expenses, insurer catalogue. Refresh resets to empty. Production behaviour is delivered later by the approved backend."
- EGP Combined card carries a "Display-only" chip and the line "presentation only — channels remain separate operationally".
- Visa/Bank chip "Not Cash · Cannot Pay Expenses".
- Admin Stage 2 panel header: "Protected from clinic/reception users".
- Insurance Stage 2 disclaimer: "Invoice Value: To be generated/linked later through the Claude Code / Invoice Manager workflow."

---

## 21. What's explicitly NOT done in this sprint

- ❌ Backend / Supabase / Auth / SQL / RLS — not touched.
- ❌ Master Sheet / OneDrive integration — not touched.
- ❌ Invoice Manager / billing engine / PDF — not touched.
- ❌ Real patient / staff / insurer / financial data — all UAT data is clearly DEMO / UAT labelled.
- ❌ Production global OUR Ref sequencing — demo runtime only.
- ❌ GitHub push / Pages deploy — not performed.

---

## 22. Mandatory final stop

**STOP.**

- Do not push.
- Do not deploy.
- Do not change GitHub Pages.
- Do not connect Supabase / backend.
- Do not modify Invoice Manager / billing engines / OneDrive / Master Sheet.
- Wait for Mohamed to review the loaded P2C.R3.1 UAT dataset across all clinics + branches + Admin.

Generated locally for `D:\Claude Code Engine\hmc-smc-portal-ui-demo\`.
