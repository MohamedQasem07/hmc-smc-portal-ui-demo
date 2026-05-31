# Portal field map — mock Case → `hmc-medical` `public.portal_*`
_P3-prep reference. Pairs with `src/lib/api/portalMapping.js` (the same map as code)._

**Backend home:** Supabase project `hmc-medical` (`zlgxalmaiwatnoydgkxo`), schema `public`, `portal_*` tables (migrations 001–015). `hmc-v2` is **protected — not the portal backend.** Confirm home before P3B (Decision D1).

> Default app mode is `VITE_DATA_BACKEND=mock`. Nothing here is live until P3B (approval + `npm i @supabase/supabase-js` + envs + RLS verification).

---

## The billing-queue contract (the Claude seam)
A case is ready for Claude to invoice when:
- `portal_cases.financial_type = 'insurance'`, and
- `portal_insurance_billing_preparations.billing_preparation_status = 'ready_for_claude_invoice_preparation'`.

Claude then: reads the prep row + the OneDrive folder (`onedrive_folder_path`), runs the HMC/SMC skills → `case.json` + PDFs, and writes back `future_invoice_value`, `future_invoice_json_reference`, `future_invoice_pdf_reference`, and sets status `completed`. Dedupe on `case_id` (unique).

In the **frontend mock today** the equivalent flag is `case.insuranceCompletion.billingPrepStatus === 'ready_for_claude'` (the "Ready" filter on the Insurance Completion screen).

---

## `portal_cases` / `portal_patients`  (intake)
| mock Case field | portal column | notes |
|---|---|---|
| `patient.name` | `portal_patients.first_name` + `last_name` | split; `full_name` is generated |
| `patient.dob` | `portal_patients.date_of_birth` | **age is never stored** (computed) |
| `patient.gender` Male/Female | `portal_patients.gender` male/female | enum `portal_gender` |
| `patient.nationality` | `portal_patients.nationality` | |
| `ourRef` | `portal_cases.our_ref` | unique; server may (re)generate (008) |
| `registeredAtId` (slug) | `portal_cases.registered_location_id` | resolve slug → `portal_locations.id` |
| `billingFacility` HMC/SMC | `portal_cases.billing_facility_id` | resolve → `portal_billing_facilities.id` |
| `route` | `portal_cases.route` | `direct / transfer_to_al_kawther / transfer_to_sheraton` |
| `financialType` | `portal_cases.financial_type` | `pending/cash/insurance/free_complimentary` |
| `encounterPattern` | `portal_cases.encounter_pattern` | `outpatient_single/multi / inpatient_admission` |
| `operationalStatus` Open/Closed | `portal_cases.operational_status` | `open/closed/transferred/received/cancelled` |
| `visitDate` | `portal_cases.visit_date` | date only |
| `patient.hotel` | `portal_cases.hotel_or_location` | |
| `insurance.{company,ref,email,phone}` | `portal_insurance_intakes.*` | Stage 1 (clinic-visible) |

## `portal_insurance_billing_preparations`  (admin Stage 2 — the Claude inputs)
| mock `insuranceCompletion` | portal column | status |
|---|---|---|
| `invoiceCurrency` | `invoice_currency` | exists |
| `serviceChargePct` | `service_charge_pct` | exists |
| `localAssistanceId` | `local_assistance_company_id` | exists (resolve id) |
| `localAssistanceRef` | `local_assistance_reference_number` | exists |
| `adminNotes` | `admin_notes` | exists |
| `billingPrepStatus` | `billing_preparation_status` | exists — **value rename:** `ready_for_claude` → `ready_for_claude_invoice_preparation` |
| `transportationFee` | `transportation_fee` | **NEW — needs additive migration** |
| `patientExcess` | `patient_excess_amount` | **NEW** (intake has `has_patient_excess` bool only) |
| `onedriveFolderPath` | `onedrive_folder_path` | **NEW** |
| `missingDataNote` | `missing_data_note` | **NEW** |
| _(Claude writes back)_ | `future_invoice_value`, `future_invoice_json_reference`, `future_invoice_pdf_reference`, `future_invoice_status` | exists |

### Required P3B additive migration (one small, safe `ALTER`)
```sql
alter table public.portal_insurance_billing_preparations
  add column if not exists transportation_fee     numeric(14,2),
  add column if not exists patient_excess_amount   numeric(14,2),
  add column if not exists onedrive_folder_path     text,
  add column if not exists missing_data_note        text;
```

---

## Role mapping (frontend ↔ backend)
| frontend role (`staffUsers.js`) | `portal_role` enum |
|---|---|
| `admin` | `admin` |
| `clinic_nurse` | `clinic_user` |
| `reception_kawther` / `reception_sheraton` | `reception_user` (+ branch scope via `portal_user_location_scopes`) |

Branch identity for reception comes from the location scope, not the role value — so the two `reception_*` frontend roles collapse to one backend role + a scope row.

---

## P3B connection steps (gated — Decision D2)
1. Confirm project home = `hmc-medical`; clarify the `015_canonical_admin_bridge` to `hmc-v2` (protected).
2. `npm i @supabase/supabase-js`; set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env.local`.
3. Apply the additive migration above; run the role/value renames in the data layer (`portalMapping.js` already encodes them).
4. Create real Supabase **Auth users** + `portal_user_profiles` + `portal_user_location_scopes` (server-side).
5. **Verify RLS per role** on a throwaway row (admin sees all; clinic/reception scoped; billing-prep admin-only) BEFORE any real data.
6. Snapshot/backup + documented rollback ready.
7. Flip `VITE_DATA_BACKEND=supabase`; go **read-only first**, then enable writes screen-by-screen, migrating pages onto `src/lib/api`.
