# PORTAL OUR-Ref FORMAT EVIDENCE (P3A)

**Conclusion: the production OUR-Ref format is NOT proven in this sprint.**
Final formatted generation is left **provisional/disabled** in the backend.
The `uuid` primary key is the guaranteed case identity until Mohamed approves
the confirmed format.

## Evidence gathered (read-only, local sources)

### 1. Frontend demo generator — `src/lib/ourRef.js`
Two formats are produced by the deployed demo (explicitly labelled
"DEMO sequence only … Production-global sequencing must come from an approved
backend later"):

- **HMC:** `HMC{YEAR}{NNNNN}` — 5-digit suffix, demo starts at `30001`
  e.g. `HMC202630042`
- **SMC:** `SHMC-{D}{M}{YYYY}.{NNN}` — day + month(1–12) + year token, then a
  per-day 3-digit sequence e.g. `SHMC-2752026.001` (27 May 2026, #1)

Family selection logic (demo):
- explicit billing facility HMC/SMC wins;
- main branches (Al-Kawther, Sheraton) default to HMC;
- external clinics default to SMC.

### 2. Project instructions — `CLAUDE.md`
- OUR Ref prefixes: `HMC2026XXXXX` (HMC), `SHMC-DDMYYYY.NNN` (SMC).
- `DAILY_BILLING_WORKFLOW.md` is cited as the SMC naming source
  (`SHMC-DDMYYYY.NNN`).

## Why it stays provisional
- The **authoritative** sequence + exact daily/yearly reset rules live in the
  real **Master Sheet**, which P3A must **not read or modify**.
- The demo generator is non-authoritative (local, per-session, min-floor
  hacks like "start at 30001").
- Activating a permanent format now risks colliding with the real historical
  numbering.

## Backend behaviour chosen
- `portal_cases.our_ref` — unique, **nullable**.
- `portal_case_reference_counters` — generic atomic counter table.
- `portal_reserve_case_ref(counter_key)` — atomic increment (mechanics only).
- `portal_create_case_with_ref(... , p_assign_provisional_ref default false)` —
  assigns `PROV-YYYY-NNNNNN` **only when explicitly requested**; otherwise
  `our_ref` stays null and the uuid PK is the identity.

## Required to finalise (future, with Mohamed)
1. Read-only confirmation of the exact HMC + SMC sequence rules from the
   Master Sheet (daily vs yearly reset, starting numbers, zero-padding).
2. Confirm whether OUR Ref is assigned at intake for *pending* cases or only
   after financial classification.
3. Replace the provisional generator with the approved deterministic format,
   enforced server-side + unique index (already present).
