# Sprint 2026-06-01 — Specialist separation + Visits Report + Visual redesign + Test-data cleanup

Working notes (durable; survives context compaction). Source of truth for the final report.

## Baseline (confirmed from git + live + DB)
- Repo: `D:\Claude Code Engine\hmc-smc-portal-ui-demo` (Vite 5 / React 18 / Tailwind 3.4.15 / lucide-react 0.460 / react-router 6.28).
- Branch: `staging-supabase` == `origin/main` == HEAD **`06d9f73`** (working tree clean at sprint start).
  - `06d9f73` docs: visual polish sprint final report
  - `8fbc6d7` Visual polish sprint (the live code)
- Live: https://mohamedqasem07.github.io/hmc-smc-portal-ui-demo/ — HTTP **200**, bundle `index-Chdlbfw5.js` (== current main). Deploy via `git push origin staging-supabase:main` (Pages Action).
- **ROLLBACK commit = `06d9f73`** (prior visual rollback target was `4655251`).
- Backend: `hmc-medical` (`zlgxalmaiwatnoydgkxo`), schema `public.portal_*`. `hmc-v2` (`gynsbdiofcizwbymzppq`) PROTECTED — never touch.
- Migrations: latest applied `024,025,026,027,029`. **`028` handover = NOT applied** (must stay absent).
- Run: `npm run dev` (5173 mock) · `npm run dev:supabase` (5180 live). Build/deploy: `npm run build:pages`.

## Guardrails (forbidden this sprint)
No 028; no Master Sheet import; no Old Cases import; no Invoice Manager; no mail CSV; no billing-engine change; no hmc-v2 change; no auth/RLS change; no deleting users/staff/assignments/scopes/config/reference/migrations; do NOT force external specialists into staff.

## DB cleanup plan (Part 5) — TEST OPERATIONAL DATA ONLY
All operational rows are test data created 2026-05-31 / 2026-06-01 (confirmed by inspection: gibberish patient names, owner's own name as test, refs HMC202630001-2 / SHMC-3152026.001-006 / SHMC-162026.001).

**Backup first:** `backup_test_cleanup_20260601` schema = copy of every table touched.

**DELETE (test transactional), child→parent order:**
1. portal_treasury_movements (11) — FIRST (NO ACTION ref to collections+cases)
2. portal_collections (11)
3. portal_case_charges (4)
4. portal_insurance_intakes (3)
5. portal_room_assignments (1)
6. portal_encounters (2)
7. portal_transfers (1)
8. portal_cases (9)
9. portal_patients (12)  ← incl. 3 orphan "بيبسي يبسيب" (0 cases)
10. portal_nurse_shifts (6) — test attendance
11. portal_doctor_daily_duty (4) — test attendance
- Empty already (verify 0): portal_case_services, portal_insurance_billing_preparations, portal_insurance_case_status_history, portal_patient_travel_dates, portal_handovers, portal_cash_handover_lines, portal_visa_handover_transactions, portal_expenses, portal_legacy_*.
**RESET (keep rows):** `portal_case_reference_counters.next_number = 0` (4 rows).

**PRESERVE — never touched (counts at baseline):**
- portal_staff (12), portal_user_profiles (8), portal_staff_location_assignments (11), portal_user_location_scopes (7)
- auth.users, portal_audit_log (56)
- portal_locations (9), portal_rooms (30), portal_nationalities (245), portal_payment_methods (4),
  portal_insurance_companies (3), portal_local_assistance_companies (0), portal_billing_facilities (2),
  portal_treasury_accounts (40), portal_service_catalog (0)
- All migration history.

## Real users/staff — DO NOT DELETE (confirmed present)
Staff (12): Amr Tarek, Mohamed Asaad, Karim Atta, Dr Wessam, Dr Ahmed Toni, Mohamed Ramadan, Dr Ahmed Famhy, Osama El Awady, Gamal Reda, Dr Mahmoud Hamdy, Mahmoud El Saeed, Ahmed Khedr.
Users (8): Mohamed Qasem (owner/admin), Amr Tarek, Mohamed Asaad, Karim Atta, Mohamed Ramadan, Osamaelawady, Mahmoud El Saeed, Ahmed Khedr.
Note: `portal_staff.specialty` is NULL for all 12 → the specialist=staff feature was wired but never used. Removing it loses no data.

## Code map (key paths)
- Live components: `src/pages/preview/p2c/live/Live*.jsx` (LiveSpecialistVisits, LiveUsersStaffConfig, LiveCaseWorkspace, LiveReferenceConfig, ...).
- Data layer: `src/lib/api/portalData.js`, `config.js` (IS_SUPABASE), `auth.js`, `supabaseClient.js`.
- Routing/shell: `src/App.jsx`, admin shell (AdminShell), guards `src/premium/guards.jsx`.
- Theme: tailwind.config.* + `src/index.css` (to be mapped).

## Deferred (report, do not do)
Persistent `portal_specialist_doctors` table (additive SQL, owner-gated); 028; Old Cases import; Master Sheet import; mail CSV; Invoice Manager; service-catalog seed; billing automation.
