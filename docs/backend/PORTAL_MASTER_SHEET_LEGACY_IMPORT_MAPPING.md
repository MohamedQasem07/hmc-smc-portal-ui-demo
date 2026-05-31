# PORTAL — Master Sheet Legacy Import Mapping (P3B.2)

**Read-only inspection. No patient PHI appears in this document — only counts,
column titles, category labels, and digit-masked reference shapes.**

## Source
- Workbook: `C:\Users\moham\OneDrive\2025\Work\Master Sheet New.xlsm`
- SHA-256 (read-only, pre-import): `C66C9699…F63E22B52`
- Sheet inspected for import: **`Master Sheet`**
- Other tabs present (not imported): `Master Sheet Backup` (duplicate, 3,152),
  `2026 G-Sheet` (739, alternate), plus analytics tabs (Pivot/Summary/Insights/
  Dashboard/Aging/etc.).

## `Master Sheet` headers (column index → title)
```
[0] Data Of visit     [1] Patient Name     [2] Gender        [3] DOB
[4] Nationality       [5] Hotel            [6] Treated At    [7] insured by
[8] Insurance Ref     [9] Our Case Number  [10] Diagnosis    [11] Assistance
[12] Case Statu       [13] invoice Amount  [14] Currency     [15] GOP / Paid Amount
[16] Currency2        [17] Notes2          [18..28] derived analytics (Year, Month,
     YearMonth, ParsedDate, NormHotel, NormAssist, NormStatus, OurHotelGroup,
     Quarter, IsOutstanding, DaysOutstanding)
```

## Row counts (aggregate only)
| Metric | Count |
|---|---|
| Case-like rows | 3,196 |
| With `Our Case Number` (OUR Ref) | **457** |
| Without OUR Ref | **2,739** |
| Distinct OUR Ref values | 456 |
| Duplicate OUR Ref values (rows involved) | 1 value (2 rows) |
| With `insured by` | 3,185 |
| With `Insurance Ref` | 3,153 |
| With Patient Name | 3,196 |
| With DOB | 3,157 |
| Distinct insurer spellings | 850 |
| Distinct status labels | 22 |
| Distinct currency labels | 5 (incl. 1 junk) |
| Visit years | 2024: 1,426 · 2025: 1,317 · 2026: 453 |

## OUR Ref evidence (digit-masked shapes)
| Count | Shape | Interpretation |
|---|---|---|
| 203 | `HMC########` | HMC + 8 digits (likely year(4)+seq(4)) |
| 189 | `HMC#########` | HMC + 9 digits (year(4)+seq(5)) — matches demo `HMC2026XXXXX` |
| 32 | `SHMC-######.###` | SMC, day-token 6 + seq 3 |
| 28 | `SHMC-#######.###` | SMC, day-token 7 + seq 3 |
| 4 | `SHMC-########.###` | SMC, day-token 8 + seq 3 |
| 1 | `HMC##########` | HMC + 10 digits (outlier) |

**Conclusion:** HMC = `HMC{YYYY}{seq}` with **non-fixed** seq width (4–6);
SMC = `SHMC-{D}{M}{YYYY}.{NNN}` (un-padded day/month → 6–8 digit token).
The format is **not a single unambiguous rule**, so production OUR-Ref
generation stays **PROVISIONAL** (P3A decision unchanged). OUR Ref is also
**sparse** (only 457/3,196) → it appears to be assigned at formal
case-numbering/invoice time, not at intake. **Recommendation for new cases:**
assign OUR Ref server-side at the formal numbering step, family by billing
facility (HMC vs SMC), after Mohamed confirms exact seq-padding rules from the
sheet's own history.

## Proposed field mapping → Portal
| Master Sheet column | Portal destination |
|---|---|
| Patient Name | `portal_patients.first_name/last_name` (split best-effort) |
| Gender | `portal_patients.gender` (normalize → male/female) |
| DOB | `portal_patients.date_of_birth` |
| Nationality | `portal_patients.nationality` |
| Hotel | `portal_cases.hotel_or_location` |
| Data Of visit | `portal_cases.visit_date` |
| Treated At | `portal_cases.billing_facility_id` if it maps to HMC/SMC, else note |
| Our Case Number | `portal_cases.our_ref` (preserve exactly; null if absent) |
| insured by | `portal_insurance_companies.name` (catalogue) + intake link |
| Insurance Ref | `portal_insurance_intakes.insurance_reference_number` |
| Assistance | `portal_local_assistance_companies.name` (Admin Stage-2) |
| Case Statu | `portal_insurance_case_status_history` (normalized + original kept) |
| invoice Amount + Currency | `portal_insurance_billing_preparations.future_invoice_value` (Admin-only) |
| GOP / Paid Amount + Currency2 | Admin-only billing preparation / status note |
| Notes2 | Admin notes (Admin-only) |
| Diagnosis | `portal_cases.short_clinical_note` (Admin-only legacy) |

All imported insurance/billing/financial fields are **Admin-only** via RLS.

## Currency normalization
`Euro` → `EUR`; `EUR` → `EUR`; `GBP` → `GBP`; `USD` → `USD`; the single junk
value `1434.75` → **exception** (`invalid currency`).

## Proposed status normalization (originals always preserved)
> Mohamed must review/adjust — these drive his follow-up. `original_legacy_status_text`
> is stored verbatim; `normalized_status` is best-effort.

| Master Sheet status (+ case variants) | normalized_status |
|---|---|
| Paid | paid |
| GOPED / Goped | gop_received |
| FGOP | waiting_final_gop *(review)* |
| Pre-GOP | gop_requested |
| No GOP / NO GOP / No Gop | gop_requested *(review)* |
| NOC | insurance_confirmed *(review)* |
| Not Sent / Not sent | pending |
| Invoiced | invoice_issued |
| No invoice (+ variants) / No MR- | needs_review |
| Rejected / rejected / Rejection / Declined | rejected |

## Import routing (every row accounted for)
- **Promote to final `portal_cases`** (admin-only legacy): rows with a **unique
  OUR Ref** + insurer present (≈455).
- **Staging only** (`portal_legacy_case_staging`): rows **missing OUR Ref**
  (2,739) → `missing_our_ref`; the **duplicate** OUR Ref rows (2) →
  `duplicate_our_ref`; junk-currency / missing-required → respective exception
  status. Nothing is silently skipped: `inspected = promoted + staged`.

## Blockers / decisions needing Mohamed
1. **Import mechanism credential** (PHI-safe): provide hmc-medical service-role
   key or DB connection string for the local import script (never committed).
2. **Scope of "final" promotion**: only OUR-Ref rows (≈455) now, or also bulk
   the 2,739 no-ref rows into final with `our_ref` pending? (Default chosen:
   final = OUR-Ref rows; rest → staging for review.)
3. **Status normalization table** above — confirm/adjust.
4. **Insurer de-duplication** (850 spellings) — import distinct as-is now;
   fuzzy-merge is a later cleanup (flagged).
