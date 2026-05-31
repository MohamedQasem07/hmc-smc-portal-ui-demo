# Pending (DRAFT) migrations — Post-Pilot Additive Foundation Sprint

**STATUS: NOT APPLIED. Approval-gated. Do NOT run against `hmc-medical` without owner sign-off.**

All files here are **additive-only**: new tables / nullable columns / new or
faithfully-extended SECURITY DEFINER RPCs. No drops of existing data objects, no
enum `ALTER TYPE`, no RLS weakening, no data mutation.

- Baseline: live deploy `b299a36` (`origin/main`). Project `hmc-medical` = `zlgxalmaiwatnoydgkxo`.
- Migration `019` was repo-missing and is mirrored at `supabase/migrations/019_config_reference_tables.sql`.

## Apply order (via MCP `apply_migration`, AFTER approval)
- **Bundle 1 (low risk):** `024`, `025`, `026`, `027`, `029`
- **Bundle 2 (separate approval — money logic):** `028`

When a file is applied, move it from `migrations_pending/` → `migrations/`.

## Files
| File | Phase | Change |
|---|---|---|
| `024_portal_service_catalog.sql` | B | `portal_service_catalog` + `portal_case_services` (new tables) |
| `025_portal_insurance_company_master_fields.sql` | C | nullable cols on insurer + assistance tables |
| `026_portal_staff_specialty.sql` | D | `portal_staff.specialty` (nullable) |
| `027_portal_cases_free_approval.sql` | E | `free_approved_by/at/notes` (nullable) |
| `028_portal_handover_closure.sql` | F | `handover_id` link + cash/visa per-purpose split + visa voucher + RPCs |
| `029_portal_discharge_case_rpc.sql` | G | `portal_discharge_case()` atomic RPC |

## Insurance Excess rule (Phase F — owner correction 2026-05-31)
Insurance Excess **is treasury money**. It is **INCLUDED** in the drawer/handover by
payment method (`physical_cash` or `visa_bank`). `collection_purpose` only **splits the
report** (`cash_case_payment` vs `patient_excess`). Excess is **never excluded** from
settlement and **never shown as ordinary cash-case revenue**.
- Physical-cash handover book amount per currency = cash-case + patient-excess (both included), with a frozen split stored on the line.
- Visa handover includes both purposes; the per-purpose split is derivable from the linked collection; a voucher/slip reference is captured per transaction.
- "Open" treasury balance = collections where `handover_id is null`. Original collections are never deleted; daily reports always show them.

## Rollback
Each file carries its own rollback block in its header comment. `028` also recreates the
original 3-arg `portal_confirm_visa_handover` (original body preserved in `028`'s header).

## Verification
Per-file verification queries are in the design report (section 5) and each file header.
