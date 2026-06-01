# Pilot Cleanup — Approval Request (NOTHING DELETED YET)

_Prepared 2026-05-31 against **hmc-medical** (`zlgxalmaiwatnoydgkxo`). Read-only inventory. **No row deleted, no user disabled. Awaiting owner approval.**_
_hmc-v2 untouched. Reference/master data and the real owner account are KEEP-only._

## 0. Summary of what would be touched
| Action | Scope | Items |
|---|---|---|
| **KEEP** | real owner + reference/master | 1 account + 6 reference tables (+ counters, audit log) |
| **DISABLE** (reversible) | test login accounts | 10 `*.test` users |
| **DELETE** | operational test/demo rows | 11 cases + 11 patients + 60 dependent rows + 5 staff + 4 demo insurers |
| **DROP (review)** | leftover schemas | `backup_cleanup_20260531` (drop) · `portal` prototype (confirm first) |

---

## 1. KEEP — never touch
- **Real owner account:** `mohamedqasem436@gmail.com` — "Mohamed Qasem", role admin, active. **KEEP. Do not touch password.**
- **Reference / master data (KEEP):** `portal_locations` 9 · `portal_rooms` 30 · `portal_nationalities` 245 · `portal_payment_methods` 4 · `portal_billing_facilities` 2 · `portal_treasury_accounts` 40.
- **Also keep:** `portal_case_reference_counters` 3 (OUR-Ref sequence — see note 6.2) · `portal_audit_log` 28 (audit trail).

---

## 2. DISABLE — test login accounts (10 `*.test`, all currently active)
Recommend **disable** (set `portal_user_profiles.active = false` + ban the auth user) rather than hard-delete, so audit-log attribution stays intact and they can be re-enabled. Real owner is NOT in this list.

| # | Email | Display name | Role | Last login |
|---|---|---|---|---|
| 1 | `admin@portal.test` | TEST Admin | admin | 2026-05-31 (password broken) |
| 2 | `claude-verify-admin@portal.test` | TEMP Claude Verify Admin | admin | 2026-05-31 (temp — created for verification) |
| 3 | `kawther@portal.test` | TEST Al-Kawther Reception | reception_user | 2026-05-31 |
| 4 | `sheraton@portal.test` | TEST Sheraton Reception | reception_user | never |
| 5 | `tropitel@portal.test` | TEST Tropitel User | clinic_user | 2026-05-31 |
| 6 | `romance@portal.test` | TEST Romance User | clinic_user | 2026-05-31 |
| 7 | `sahl_hasheesh@portal.test` | TEST Sahl Hasheesh User | clinic_user | 2026-05-30 |
| 8 | `mamsha@portal.test` | TEST Mamsha User | clinic_user | 2026-05-30 |
| 9 | `pharaoh@portal.test` | TEST Pharaoh User | clinic_user | 2026-05-31 |
| 10 | `menamark@portal.test` | TEST Menamark User | clinic_user | never |

Plus **`portal_user_location_scopes` (8 rows)** — clinic/branch scopes granted to these test users → delete with them.

---

## 3. DELETE — operational test/demo data (every row is test; 0 real cases)

### 3.1 Cases — `portal_cases` (11) + `portal_patients` (11)
| OUR Ref | Patient | Route / Financial | Status |
|---|---|---|---|
| `SHMC-3152026.002` | CashTest PatientA | direct / cash | open |
| `HMC202630001` | InsTest PatientB | direct / insurance | open |
| `SHMC-3152026.003` | VisaTest PatientVisa | direct / cash (visa) | open |
| `SHMC-3152026.004` | CashMulti PatientCash | direct / cash | open |
| `SHMC-3152026.005` | InsExcess PatientIns | direct / insurance + excess | open |
| `SHMC-3152026.006` | XferTest PatientKawther | transfer→Al-Kawther / cash | received (surgical) |
| _(no ref — UI `PORTAL-5d2e11de`)_ | XferIns PatientInsTest | transfer→Al-Kawther / insurance | received |
| `SHMC-3152026.007` | SMOKEDEPLOY Cash0531 | direct / cash | open · smoke |
| `SHMC-3152026.008` | SMOKEDEPLOY Xfer0531 | transfer→Al-Kawther / cash | received · smoke |
| `HMC202630002` | SMOKEDEPLOY Visa0531 | direct / cash (visa) | open · smoke |
| `HMC202630003` | SMOKEDEPLOY Ins0531 | direct / insurance | open · smoke |

### 3.2 Dependent operational rows (delete with the cases)
| Table | Rows | Note |
|---|---|---|
| `portal_collections` | 9 | cash + visa payment lines |
| `portal_treasury_movements` | 9 | one per collection |
| `portal_transfers` | 3 | all to Al-Kawther (all received) |
| `portal_encounters` | 3 | specialist visits / sessions |
| `portal_insurance_intakes` | 4 | Stage-1 insurer intakes |
| `portal_case_charges` | 1 | the `.005` patient-excess charge |
| `portal_nurse_shifts` | 2 | incl. **1 still ACTIVE** (Nadia Mostafa @tropitel) |
| `portal_doctor_daily_duty` | 1 | Dr Karim Fouad @tropitel |
| `portal_room_assignments` | 0 | already empty |
| `portal_handovers` / `portal_cash_handover_lines` / `portal_visa_handover_transactions` | 0 | already empty |
| `portal_patient_travel_dates` | 0 | already empty |
| `portal_insurance_case_status_history` | 0 | already empty |

### 3.3 Staff — `portal_staff` (5) + `portal_staff_location_assignments` (4)
| Staff | Code | Role | Assignments |
|---|---|---|---|
| Nadia Mostafa | S2-NUR-001 | nurse | 1 (tropitel) |
| Dr Karim Fouad | S2-DOC-001 | doctor | 1 (tropitel) |
| Mahmoud Khamis | STF-NUR-JU3HE | nurse | 1 |
| Mahmoud Saeed | STF-NUR-JSLJL | nurse | 1 |
| Amr Tarek | STF-REC-JT2UL | reception | 0 |

### 3.4 Demo insurers — `portal_insurance_companies` (4)
`Allianz Care S3` · `Phase3 SMC Insurer` · `Phase4 Receive Insurer` · `SMOKE Insurer 0531`.
(All test-created. Not a curated insurer catalogue — confirm you don't want to keep any as a seed.)

---

## 4. DROP — leftover schemas (separate decision)
- **`backup_cleanup_20260531`** (20 tables) — backup snapshot from the earlier Phase-0 cleanup (portal_cases 9, portal_patients 6, portal_collections 2, portal_transfers 1, portal_staff 13, portal_user_profiles 10, …). Pure backup of already-removed test data → **safe to `DROP SCHEMA … CASCADE`** once you're happy with live data.
- **`portal`** (prototype schema, 7 tables: `clinics` 8, `profiles` 11, `admin_bootstrap` 2, `cases`/`case_files`/`insurance_companies`/`payments` 0) — an **earlier data model**, separate from the live `public.portal_*`. **REVIEW BEFORE DROPPING** — `admin_bootstrap` may be referenced by the `admin-users` Edge Function (owner-bootstrap). Do not drop until that's confirmed.

---

## 5. Totals to approve
- **Disable:** 10 `*.test` users (+ 8 location scopes).
- **Delete (operational):** 11 cases, 11 patients, 9 collections, 9 treasury movements, 3 transfers, 3 encounters, 4 insurance intakes, 1 case charge, 2 nurse shifts, 1 doctor duty, 5 staff, 4 staff assignments, 4 demo insurers = **66 rows + the 18 user/scope items**.
- **Drop:** `backup_cleanup_20260531` schema (20 tables). `portal` prototype schema → review.
- **Keep:** real owner account + locations 9 / rooms 30 / nationalities 245 / payment methods 4 / billing facilities 2 / treasury accounts 40 / reference counters 3 / audit log 28.

## 6. Notes for execution (only after approval)
1. **FK-safe order:** collections + treasury_movements + encounters + case_charges + insurance_intakes + transfers + room_assignments → cases → patients; then staff_assignments → staff; then insurers; then user scopes → disable users. (Exact ON-DELETE rules to be confirmed at execution.)
2. **OUR-Ref counters:** decide whether to reset `portal_case_reference_counters` to 0 after the wipe (so the first real case starts clean) or leave as-is (next refs continue from current). Recommend reset for a clean pilot start.
3. Recommend a fresh `backup_cleanup_<date>` snapshot immediately before executing, then drop the old one afterward.
4. Nothing here touches hmc-v2, the Master Sheet, Old Cases, billing engines, or the Invoice Manager.

## 7. EXECUTED — 2026-05-31 (owner-approved)
- **Backup taken first:** schema `backup_pilot_cleanup_20260531` (17 tables, row-for-row verified vs source before any delete). The earlier `backup_cleanup_20260531` was left untouched.
- **Disabled (not deleted):** 10 `*.test` auth users banned (`banned_until = 2099-12-31`) + `portal_user_profiles.active = false`. Owner `mohamedqasem436@gmail.com` untouched (active, not banned, password unchanged).
- **Deleted (FK-safe order):** treasury_movements 9 → collections 9 → case_charges 1 → encounters 3 → insurance_intakes 4 → transfers 3 → nurse_shifts 2 → doctor_daily_duty 1 → staff_location_assignments 4 → cases 11 → patients 11 → staff 5 → insurance_companies 4. (+ empty tables: room_assignments / travel_dates / status_history / billing_preparations / visa_handover / cash_handover_lines = 0.)
- **Counters reset:** `portal_case_reference_counters.next_number = 0` (all 3 keys).
- **Verified after:** cases/patients/collections/treasury_movements/transfers/encounters/insurance_intakes/case_charges/nurse_shifts/doctor_duty/staff/staff_assignments/insurers all = **0**; owner active + can-login = true; 10 test users banned; reference/master intact (locations 9, rooms 30, nationalities 245, payment_methods 4, billing_facilities 2, treasury_accounts 40); audit_log 28 preserved; backup intact.
- **Intentionally kept (not in approved scope):** 11 `portal_user_profiles` rows (10 disabled test + 1 owner), 8 `portal_user_location_scopes` (tied to disabled users), `backup_cleanup_20260531`, `portal` prototype schema, `portal_audit_log`.

**STATUS: COMPLETED. Database is pilot-clean (0 operational rows). Awaiting real pilot data.**
