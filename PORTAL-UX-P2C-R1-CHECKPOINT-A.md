# PORTAL-UX-P2C.R1 — Checkpoint A Handover

**Sprint:** Real Clinic Operations Workspace Redesign
**Date:** 2026-05-27
**Scope:** Local UI/UX concept only — no backend, no deployment, no GitHub push.
**Status:** Checkpoint A ready for Mohamed's visual + operational review. **STOP** — no Sheraton full expansion / Checkpoint B work started.

---

## 1. Baseline + safety

- ✅ **Public baseline `hmc-smc-portal-ui-demo_P2B2_AEGIS_BASELINE_6a64b16` is unchanged.**
  Folder last-modified 2026-05-27 08:33 (before any R1 work). 197 files, untouched.
- ✅ Pre-R1 snapshot taken before any modification:
  `D:\Claude Code Engine\hmc-smc-portal-ui-demo_P2C_PRE_R1_SNAPSHOT_20260527\`
- ✅ No `git push`, no GitHub interaction, no public deploy.
- ✅ No Supabase, Auth, SQL, RLS, OneDrive, Master Sheet, Invoice Manager, billing/PDF engine code added or imported.
- ✅ All R1 cases, staff, hotels, refs are clearly DEMO placeholders. Patient names start "Demo …", refs are `DEMO-P2C-R1-*`, insurers prefixed `Demo …`.

## 2. Files modified for P2C.R1 (everything else untouched)

| File | Change |
|------|--------|
| `src/data/p2cR1.js` | **NEW** — additive R1 mock data layer (cases, hotels + hotel rooms, payment lines, excess lines, free / complimentary, room board 1–15, nurses, doctors, shifts, currency treasury, Visa/Bank EGP, expenses, handover periods) |
| `src/premium/OperationalShell.jsx` | Extended `navItemsFor()` to expose Treasury, Expenses, Attendance (clinic) and Rooms, Treasury (reception). Mobile bottom-nav keeps 5 most-used tabs per role. |
| `src/pages/preview/p2c/clinic/ClinicNewCaseP2C.jsx` | **REDESIGNED** — full-width multi-column intake form. |
| `src/pages/preview/p2c/clinic/ClinicMyCasesP2C.jsx` | **REDESIGNED** — operational table dashboard. |
| `src/pages/preview/p2c/clinic/ClinicTreasuryP2C.jsx` | **NEW** — currency cards + Visa/Bank EGP + expense entry + handover. |
| `src/pages/preview/p2c/clinic/ClinicAttendanceP2C.jsx` | **NEW** — nurse shifts + doctor-on-duty. |
| `src/pages/preview/p2c/reception/ReceptionDashboardP2C.jsx` | **REDESIGNED** — KPI strip + Room Board 1–15. |
| `src/pages/preview/p2c/reception/ReceptionIncomingDetailP2C.jsx` | **REDESIGNED** — Original Registration | Receiving Branch Actions two-panel. |
| `src/pages/preview/p2c/reception/ReceptionTreasuryP2C.jsx` | **NEW** — branch treasury, no expense entry. |
| `src/App.jsx` | Added 5 routes: `/clinic/treasury`, `/clinic/expenses`, `/clinic/attendance`, `/reception/:branchSlug/rooms`, `/reception/:branchSlug/treasury`. |

All P0 / P1 / P2A / P2B routes and all other P2C screens still resolve to their previous components. Old data file `src/data/p2c.js` was not modified.

## 3. The seven anchor screens to review (local URLs)

Dev server: `npm run dev` → http://localhost:5173

| # | Screen | URL |
|---|--------|-----|
| 1 | External Clinic — Full Desktop New Case | http://localhost:5173/design-preview/clinic/new-case |
| 2 | External Clinic — My Cases (table dashboard) | http://localhost:5173/design-preview/clinic/cases |
| 3 | External Clinic — Treasury / Expenses / Handover | http://localhost:5173/design-preview/clinic/treasury |
| 4 | External Clinic — Attendance | http://localhost:5173/design-preview/clinic/attendance |
| 5 | Al-Kawther — Reception & Rooms Dashboard | http://localhost:5173/design-preview/reception/al-kawther/dashboard |
| 6 | Al-Kawther — Received Transfer Detail / Assignment | http://localhost:5173/design-preview/reception/al-kawther/incoming-transfers/r1_p2c_003 |
| 7 | Al-Kawther — Treasury & Handover (no expenses) | http://localhost:5173/design-preview/reception/al-kawther/treasury |

Clinic identity is switched in the top-right "Clinic" pill (Tropitel default — switch to Romance / Mamsha / etc. to see different demo data). Reception URLs also work with `/sheraton/...` but per spec Sheraton stays as a parallel shell only at this checkpoint.

Additional demo entry points:
- Role landing: http://localhost:5173/design-preview/demo-roles
- More received-transfer demos:
  - http://localhost:5173/design-preview/reception/al-kawther/incoming-transfers/r1_p2c_004 (Romance → AK Insurance/HMC + surgical pre-filled)
  - http://localhost:5173/design-preview/reception/sheraton/incoming-transfers/r1_p2c_202 (Pharaoh → Sheraton, pending receipt)

## 4. Feature-presence confirmations (spec §24)

- ✅ **Full patient intake fields present** — visit date/time, arrival, departure, first/last name, DOB, age, gender, nationality (searchable list), hotel/resort or address, hotel room, postal, country code + phone, patient email, clinical note. Multi-column on desktop, stacked on mobile.
- ✅ **External clinics record Hotel Room** — "Hotel Room No." field in Section 3 (Location & Contact) and propagated through `R1_CASES.patient.hotelRoom` to the My Cases table, Receiving panel and Room Board.
- ✅ **Main branches record Center Room 1–15** — Center Room grid in Receiving panel (step 2) and direct-case admission. Room Board displays `Room 01` – `Room 15`. Future admin-configurable concept is called out in copy.
- ✅ **Transferred patient preserves Hotel Room AND adds Center Room** — Receiving panel pins `Original Registration` (registered at, hotel, hotel room) on the left; `Receiving Details` (center room) on the right. Both visible together — Room Board card also shows both `Hotel: <hotel> — <hotel room>` + the `Room NN` slot.
- ✅ **Cash supports multi-payment lines** — `PaymentLines` component in New Case form. Add / remove lines. Per-line method, currency, amount, FX-reference fields, note. Live "Collected" totals + Paid / Partially Paid / Pending status.
- ✅ **Visa / Card is EGP bank collection only** — When `method = Visa / Card` the Currency dropdown auto-locks to EGP, the field shows a "(locked)" hint and a banner reading *"Visa / Card collection is always EGP (Bank Collection — not added to physical cash treasury)."*
- ✅ **Insurance includes HMC/SMC, insurer details and Patient Excess** — Insurance block enforces HMC/SMC choice, captures insurer name + ref + email, and conditionally shows the multi-line Excess collection panel with the same Visa-EGP-only rule.
- ✅ **Free / Complimentary financial type exists** — Fourth Financial Classification card; selecting it reveals reason + approved-by fields and the case is flagged Complimentary in My Cases.
- ✅ **External-clinic expense validation** — `ClinicTreasuryP2C` Expense Entry rejects (1) trying to pay from Visa/Bank, (2) requesting more than available physical cash in the same currency. The rejection banner uses Mohamed's exact wording: *"Expense cannot exceed available physical cash balance in the same currency. Visa / Bank collections are not available for cash expenses."*
- ✅ **Treasury/handover representation** — Per-currency cash cards (collections / excess / expenses / handed-over / **net available**) on both Clinic and Branch Treasury pages; separate Visa/Bank EGP card; Open Handover Statement with currency-separated rows + closed-handover history. Branch variant explicitly shows expenses as N/A (branch accountants).
- ✅ **Attendance representation** — Clinic Attendance page: nurse clock-in/out with multiple active shifts in the same day, hours-so-far computed live, closed shifts table, doctor-on-duty single select, daily summary preview.
- ✅ **Main branch Room Board** — Dashboard top section. Cards for Rooms 01–15 each showing Available (with `+ Assign Patient`) or Occupied (patient + From clinic + Hotel/Room + Billing Facility + Treatment Mode).
- ✅ **Treatment Mode independent of Financial Type / Route** — `R1_TREATMENT_MODES` = Not Determined Yet / Conservative / Surgical. Visible on Room Cards, Receiving panel (step 4), Patient header. Confirmed copy: *"Treatment Mode is independent of Route and Financial Type. It is only an operational classification — no billing impact in this demo."*

## 5. Responsive QA result

- Verified at **1440 × 900 (desktop)** and **375 × 812 (mobile)** via Claude Preview MCP.
- Desktop:
  - New Case form uses 12-col grid — Visit & Timing / Patient Identity / Location & Contact sit side-by-side; Clinical Note + Route sit side-by-side; Financial Classification spans full width.
  - My Cases is a full-width operational table with all 12 columns visible (Time, Demo Ref, Patient, Nationality, Hotel/Room, Financial, Route, Destination, Facility, Status, Op, Action).
  - Reception Dashboard KPIs spread to 8 across, Room Board 5 cards per row.
- Mobile:
  - Form sections stack vertically with comfortable touch targets.
  - My Cases switches to compact two-line rows (NOT oversized cards), bottom nav shows 5 items.
  - Reception KPIs go to 2-col grid, Room Board to 2-col cards, bottom nav: Home / + Direct / Incoming / Rooms / Treasury.
  - No horizontal overflow anywhere.
- Production build clean: `npm run build` → ✓ built in 4.09s, 1666 modules transformed, 0 errors.

## 6. Safety scan result

- ✅ No GitHub push — none of `git push`, `gh pr`, `gh release` were ever issued.
- ✅ No public deployment.
- ✅ Public baseline commit `6a64b16` snapshot folder unchanged.
- ✅ No Supabase / Auth / SQL / RLS / backend imports anywhere in `src/`. Two text-only matches for "supabase" / "invoice_manager" are intentional UI copy: the role landing page reassurance line and a future-protected-module placeholder label.
- ✅ No Master Sheet / OneDrive / Microsoft Graph access.
- ✅ No Invoice Manager / PDF billing engine code touched. HMC + SMC billing skill folders (`hmc-billing-skill-v3.0`, `SMC-Billing-Skills`) outside this app were not even read this session.
- ✅ No real patients, employees, insurer refs, financial data. All demo records use clearly fake names (Demo Patient Alpha, Demo Nurse Alia, Demo Allianz, DEMO-P2C-R1-NNNN, etc.).
- ✅ "DEMO DATA · Preview Only" / "UI Concept · No backend connected" banners are present on every R1 page.

## 7. Items still awaiting Mohamed's approval (Checkpoint A)

These are intentionally NOT done — STOP condition per spec §25.

- ❌ Sheraton full expansion (Sheraton currently uses the same screens as a parallel shell; not custom-styled per branch).
- ❌ Daily Report redesign (still shows old layout — depends on the approved approach to KPIs/handover/attendance from Checkpoint A).
- ❌ Admin Cases Master / Admin Case Detail extension to expose Hotel Room, Center Room, Treatment Mode, Billing Facility, Excess status fields.
- ❌ "Other Destination" admin reference-list management UI.
- ❌ Future audit history for billing-facility overrides.
- ❌ Multi-nurse handover acknowledgement flow.
- ❌ Surgical-treatment UI surfacing in branch room board's "Open — Surgical" badge variants beyond the basic treatment-mode pill.

## 8. Where to start the review

Recommended click path for Mohamed:

1. `http://localhost:5173/design-preview/demo-roles` — pick **External Clinic**, leave clinic as **Tropitel Clinic**.
2. From the side rail, hit **+ New Case** → see the full-width intake form. Choose **Insurance** → HMC/SMC selector appears, Excess toggle Yes → Excess multi-line appears. Try **Cash** → multi-payment lines, set one line to **Visa / Card** → currency auto-locks to EGP.
3. Side rail **My Cases** — table dashboard.
4. Side rail **Treasury** — try **Record Expense** with currency EGP, amount 200, Paid From "Visa / Bank — try (will fail)" → the rejection banner fires. Try the same as "Physical Cash Balance" → demo accepts.
5. Side rail **Attendance** — start a nurse shift, end one.
6. Back to **/design-preview/demo-roles** → pick **Al-Kawther Reception**.
7. The Dashboard shows Room Board 1–15. Click Room 03 (Demo Patient Gamma) or use the side rail **Incoming** → pick Demo Patient Gamma → see Original Registration / Receiving Branch Actions side-by-side, both hotel room and center room visible.
8. Side rail **Treasury** — branch variant with N/A expenses column and reception-only advisory.

If anything in this Checkpoint A is wrong or incomplete, Checkpoint B (Sheraton full expansion, admin connection points, daily reports) is **deliberately blocked** until Mohamed approves the operational model demonstrated here.

— Generated locally for `D:\Claude Code Engine\hmc-smc-portal-ui-demo\` — no backend, no upload.
