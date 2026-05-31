# PORTAL BACKEND ARCHITECTURE (P3A)

HMC / SMC Clinic Portal — secure Supabase data foundation.
**Status:** schema + RLS + functions authored. Execution gated on Mohamed's
target-project approval (see `PORTAL_SUPABASE_EXECUTION_REPORT.md`).

> This sprint builds the **future operational source of truth** only. It does
> NOT connect the deployed frontend, does NOT implement production login in the
> app, does NOT generate invoices, and does NOT touch Invoice Manager / PDF
> engines / Master Sheet / OneDrive.

## 1. Design principles

1. **Supabase Auth is the identity provider.** No plaintext-password table.
   `portal_user_profiles.user_id` references `auth.users(id)`.
2. **RLS from creation.** Every `portal_` table has RLS enabled in the same
   migration that creates it (002–007). Until policies land (009) the tables
   are closed (RLS enabled + no policy = deny-all). There is never a window
   where a sensitive table is anon-readable.
3. **Server-side trust for money + identity.** FX math, treasury balance
   checks, attendance assignment validation, and OUR-Ref reservation run in
   `SECURITY DEFINER` functions, not in the frontend.
4. **Ledger is truth.** `portal_treasury_movements` is append-only; balances
   are derived (`portal_treasury_balances`, `portal_account_balance()`). No
   editable running totals; corrections use reversal movements.
5. **Two-stage insurance privacy.** Stage 1 intake is clinic-visible; Stage 2
   billing preparation is **admin-only** at the RLS level.
6. **Append-only audit.** `portal_audit_log` has no UPDATE/DELETE policy;
   inserts happen through `portal_audit()` (SECURITY DEFINER).

## 2. Domain separation (kept distinct in the schema)

| Concept | Column / table | Values |
|---|---|---|
| Billing facility | `portal_billing_facilities` | HMC, SMC |
| Operational location | `portal_locations.location_type` | external_clinic, main_branch |
| Route | `portal_cases.route` | direct, transfer_to_al_kawther, transfer_to_sheraton, transfer_other |
| Financial type | `portal_cases.financial_type` | pending, cash, insurance, free_complimentary |
| Encounter pattern | `portal_cases.encounter_pattern` | outpatient_single, outpatient_multi, inpatient_admission |
| Treatment mode (branches) | `portal_cases.treatment_mode` | not_determined, conservative, surgical |

These are **separate fields** — never merged into one overloaded "case type".

## 3. Security model

Roles (`portal_role`): `admin`, `clinic_user`, `reception_user` (active) +
reserved future roles (`owner`, `insurance_staff`, `treasury`, `nurse`,
`doctor`, `viewer_auditor`).

Helper functions (SECURITY DEFINER, locked `search_path`):
- `portal_is_admin()` — admin role check.
- `portal_is_active_user()` — any active profile.
- `portal_has_location(loc)` — admin OR active scope row for the location.
- `portal_can_access_case(case_id)` — admin OR scope on registered/current
  location OR scope on an incoming transfer's destination.

Policy summary:
- **Reference** (facilities, locations, rooms, insurers): read by active
  users; write admin-only. Local assistance: admin-only entirely.
- **Cases / patients / encounters / travel / transfers / rooms / charges /
  intakes**: location-scoped via the helpers; clinic/reception users
  read+write only within scope.
- **Collections / expenses / treasury_movements / visa handover / attendance**:
  read scoped; **writes via SECURITY DEFINER functions** (direct table writes
  are admin-only) so server-side rules are always enforced.
- **`portal_insurance_billing_preparations`**: admin-only (no non-admin
  policy at all).
- **`portal_treasury_movements` / `portal_audit_log`**: immutable (no
  UPDATE/DELETE policy).
- **anon**: `REVOKE ALL` on every `portal_` table; no anon policy anywhere.

## 4. Secure functions

| Function | Enforces |
|---|---|
| `portal_record_collection(...)` | scope; Visa→EGP+visa_bank+FX; cash same/cross-currency FX math; creates collection + treasury movement; audit |
| `portal_record_expense(...)` | scope; location `allows_expenses`; physical_cash only; balance ≥ amount; movement; audit |
| `portal_confirm_visa_handover(...)` | scope; confirm a Visa collection once; movement (visa_bank out); audit |
| `portal_record_nurse_shift / end / record_doctor_duty` | scope; staff is active + assigned to location with matching role; audit |
| `portal_create_case_with_ref(...)` | scope; creates case; optional **provisional** ref; audit |
| `portal_reserve_case_ref(key)` | atomic counter increment (provisional only) |

## 5. OUR Ref strategy (PROVISIONAL)

The production OUR Ref format is **not finalised** in this sprint. The
guaranteed identity is the `uuid` primary key. `portal_cases.our_ref` is a
unique, nullable column. `portal_create_case_with_ref()` only assigns a
clearly-marked provisional value (`PROV-YYYY-NNNNNN`) when explicitly asked
(`p_assign_provisional_ref => true`). The confirmed-format evidence (HMC /
SMC patterns observed in the frontend + CLAUDE.md) is documented in
`PORTAL_REFERENCE_FORMAT_EVIDENCE.md` but is **not activated** pending
Mohamed's approval and a read-only confirmation against the real Master
Sheet (which this sprint does not touch).

## 6. Date / validation notes

- **Age is never stored.** Only `portal_patients.date_of_birth`. Age is
  computed at read time (frontend/view) from DOB + encounter date.
- **Travel dates ≠ encounter times.** `portal_patient_travel_dates` holds
  tourist arrival/departure; encounters hold clinical check-in/out.
- **Travel validity** (`arrival ≤ today ≤ departure` *at entry time*) is
  enforced in the API/function layer, not as a `CURRENT_DATE` check
  constraint (non-immutable). A static ordering constraint
  (`arrival ≤ departure`) IS enforced at the table.
- **Room exclusivity**: partial unique index — at most one `occupied`
  assignment per room.

## 7. Money types

- Money: `numeric(14,2)`; FX rate: `numeric(14,6)`; currencies enum
  `portal_currency` = EGP/EUR/USD/GBP; timestamps `timestamptz`; UUID PKs.

## 8. Migration order

```
001 extensions + enums + updated_at trigger fn
002 master tables (facilities, locations, rooms) + seeds
003 staff, assignments, user profiles, location scopes
004 patients, ref counters, cases, encounters, travel, transfers, room assignments
005 insurance catalogue + intakes + admin-only billing preparations
006 charges, collections, treasury accounts/movements, expenses, handovers
007 attendance (nurse shifts, doctor duty) + audit log
008 RLS helpers + audit fn + balance view + secure business functions + provisional ref
009 base grants/revokes + all RLS policies (+ portal_can_access_case)
010 TEST-ONLY seed (personas, staff, sample case) + verification entrypoint
```

All migrations are additive, `portal_`-prefixed, idempotent where practical,
and isolated from any pre-existing schema in the target project.
