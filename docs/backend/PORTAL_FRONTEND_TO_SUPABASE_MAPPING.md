# PORTAL FRONTEND → SUPABASE MAPPING (P3A)

Maps every current deployed-frontend area to its future backend destination.
This is documentation only — no frontend code is connected to Supabase in P3A.

| Frontend Area | Backend Tables / Functions |
|---|---|
| Login / user scope | `auth.users`, `portal_user_profiles`, `portal_user_location_scopes` |
| Users & Staff (Staff Directory) | `portal_staff`, `portal_staff_location_assignments` |
| Users & Staff (Portal Users) | `portal_user_profiles`, `portal_user_location_scopes` |
| Clinic Assignment Matrix | `portal_staff_location_assignments` (+ `portal_locations`) |
| New Case — patient fields | `portal_patients` |
| New Case — case fields / OUR Ref | `portal_cases` (+ `portal_create_case_with_ref()`, `portal_case_reference_counters`) |
| Tourist travel dates | `portal_patient_travel_dates` |
| Encounter patterns (visit/session/admission) | `portal_encounters` |
| Transfers (clinic → branch) | `portal_transfers` |
| Room Board (Al-Kawther / Sheraton) | `portal_rooms`, `portal_room_assignments` |
| Insurance — clinic intake (Stage 1) | `portal_insurance_intakes`, `portal_insurance_companies` |
| Insurance — admin completion (Stage 2) | `portal_insurance_billing_preparations`, `portal_local_assistance_companies` |
| Cash amount / Patient Excess | `portal_case_charges` |
| Collection lines (cash / Visa) | `portal_collections` (via `portal_record_collection()`) |
| Treasury cards (physical cash / Visa-bank) | `portal_treasury_accounts`, `portal_treasury_movements`, view `portal_treasury_balances` |
| Expenses (external clinics) | `portal_expenses` (via `portal_record_expense()`), `portal_treasury_movements` |
| Cash handover | `portal_handovers`, `portal_cash_handover_lines` |
| Visa handover (per transaction) | `portal_handovers`, `portal_visa_handover_transactions` (via `portal_confirm_visa_handover()`) |
| Attendance — nurse shifts | `portal_nurse_shifts` (via `portal_record_nurse_shift()` / `portal_end_nurse_shift()`) |
| Attendance — doctor on duty | `portal_doctor_daily_duty` (via `portal_record_doctor_duty()`) |
| Admin oversight (cross-location) | admin RLS (`portal_is_admin()`) across all tables + `portal_treasury_balances` |
| Future Claude / Invoice Manager link | `portal_insurance_billing_preparations.future_invoice_status/value/json_reference/pdf_reference` |

## Field-level notes
- **Billing facility (HMC/SMC)** lives on `portal_cases.billing_facility_id`
  and `portal_insurance_intakes.billing_facility_id` — distinct from the
  operational location.
- **Age** is derived from `portal_patients.date_of_birth`; never stored.
- **Service Charge %, invoice currency, local assistance, future invoice
  value, admin notes** live ONLY in `portal_insurance_billing_preparations`
  (admin-only) and must never be exposed to clinic/reception users.
- **Demo-only frontend tables** (`src/data/staffUsers.js`, `p2c.js`,
  `p2cR1.js`, `uatDataset.js`) become seed sources for reference data only;
  no demo patient/financial rows are imported.

## P3B (future, not this sprint)
Connecting the frontend will replace the runtime demo session
(`UserModeContext`) with Supabase Auth, and replace `DemoStateContext`
reducers with PostgREST calls + the secure functions above, preserving the
exact same UI behaviour.
