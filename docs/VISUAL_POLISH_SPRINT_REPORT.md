# Visual Polish Sprint — FINAL REPORT
_2026-06-01 · branch `staging-supabase` → deployed to `main` · continues `docs/CONSOLIDATION_SPRINT_REPORT.md`_

## 0. Headline
A focused visual/UX pass to make the live portal read like a **clinic operations control center** rather than an AI demo, plus the two deferred frontend-safe warnings and a mobile tap-target pass. Every change lives in an `IS_SUPABASE`-only component or is `IS_SUPABASE`-guarded; **mock mode is byte-identical**. No shared `theme.css` token or shared-primitive source was edited. Both builds pass.

- **Live code commit:** `8fbc6d7`  ·  **Rollback commit:** `4655251`
- 7 files, +94 / −52.

A 4-agent read-only design/audit workflow (dashboard restyle diagnosis, treasury readability, the two warnings, mobile sweep) drove the plan.

## 1. What changed

### Admin dashboard — operations-grade restyle (live-only, `LiveAdminDashboard`)
The agent diagnosed the "AI demo" tells precisely; all fixes are in-component (no shared-component edits):
- **Header masthead** replaces the bare `SectionHeader` scaffold: a teal eyebrow ("Admin Workspace"), a real title ("Operations Overview"), an explanatory sub-line, a **Live-data** pill, and a hairline divider — the page now has a proper entry instead of looking unstyled.
- **Grouped, labeled KPIs:** the two undifferentiated 4-up tile rows are now under quiet **"Operations"** / **"Financial mix"** group labels; the financial row is **de-chipped** (clean number tiles), killing the rainbow of 8 pastel icon squares. Gaps tightened (`gap-2.5`), page rhythm denser (`py-5 lg:py-6 space-y-5`, `max-w-1440`).
- **Decorative icon chips removed** from the Treasury / Transfers / Collections / Recent-Transfers / Quick-Access section headers (they repeated the same navy glyph 6×).
- **Sharper number hierarchy:** inline transfer/collection counts bumped to 28/32px bold tabular with eyebrow-style labels, so primary figures read as primary.
- **De-pillowed Quick Access:** `rounded-2xl`→`rounded-xl`, smaller icon chips — a compact tool rail, not an app-launcher.
- **Real CTAs:** the plain blue "Open … →" text links are now subtle pill-outline buttons with a `ChevronRight`. Also fixed a **broken link** (`/admin/cases` → the live `/admin/p2c-cases`).

### Treasury cards — readability (live-only, `TreasuryMoneyCard`)
- **Per-card tone accents** so the four cards are visually distinct: **emerald** Cash Case Revenue, **amber** Insurance Excess (reads as separate, patient-owed treasury money), **sky** Physical Cash, **navy** Visa/Bank.
- **Amount-first rows:** the monetary value (`EGP 54,560.00`) is now the dominant element with a clear **"5 collections · EGP"** sub-label (pluralized) — replacing the confusing "EGP · 5".
- **Skeleton** loading + **centered icon** empty states (instead of bare grey text).
- A dedicated, always-visible **"no cross-currency conversion / no combined total"** chip under the cards (the rule was previously buried). Still **no mixed-currency grand total** and **no collection-status mutation**.

### Deferred warnings — now implemented (both `IS_SUPABASE`-guarded)
- **Visa missing-FX warning** (`PaymentLines.jsx`): an amber per-line notice in the existing full-width advisory row when a Visa/Card line has a foreign amount but no/zero FX rate — the exact case where `recordCollection` silently drops the line. Placed in the wrap-friendly advisory band so it never disturbs the 24-col grid. Mock-gated.
- **Insurance-ref hint** (clinic + reception intake): a soft "recommended — saved as (pending), completed by Admin later" hint via the `Field` component's **built-in `hint` slot** (renders inside the same grid cell — no stray column, fixing exactly why the prior attempt was deferred). Shows only when an insurer is chosen and the reference is empty. Non-blocking. Mock-gated.

### Mobile / tap targets
- Cash-invoice editor in the case workspace: `grid-cols-3` → `grid-cols-2 sm:grid-cols-3` with the Save button full-width on phones (`col-span-2 sm:col-span-1`) — the only hard 3-up among live screens.
- Enlarged sub-44px **destructive** tap targets: service-remove `w-7`→`w-9`; staff chip-remove `w-5`→`w-7`.

## 2. Files changed (7)
`src/pages/preview/PremiumAdminDashboard.jsx` (dashboard restyle + TreasuryMoneyCard), `src/premium/PaymentLines.jsx` (Visa-FX warning + IS_SUPABASE import), `src/pages/preview/p2c/clinic/ClinicNewCaseP2C.jsx` + `…/reception/ReceptionNewCaseP2C.jsx` (insurance-ref hint), `src/pages/preview/p2c/live/LiveCaseWorkspace.jsx` (cash-grid responsive), `…/live/LiveCaseServices.jsx` (remove tap target), `…/live/LiveUsersStaffConfig.jsx` (chip-remove tap targets).

## 3. Visual / design improvements (summary)
Masthead header · grouped + labeled KPIs · de-chipped financial tiles · removed repeated decorative icons · tighter spacing/density · stronger number typography · distinct treasury tone accents · amount-first treasury rows with clear sub-labels · skeleton/empty states · explicit no-FX chip · de-pillowed launcher · pill CTAs. All using existing `var(--p-*)` / Tailwind tokens — no new tokens, no `theme.css` edits.

## 4. Build result
- `VITE_DATA_BACKEND=supabase npm run build:pages` → **exit 0** (`✓ built in 5.45s`).
- `npm run build` (mock) → **exit 0** (`✓ built in 5.38s`). Pre-existing chunk-size/dynamic-import warnings only.

## 5. Live deployment
- `origin/main` `4655251 → 8fbc6d7`; `origin/staging-supabase` synced.
- GitHub Actions builds `build:pages` (supabase) from `main` → Pages.
- Live: https://mohamedqasem07.github.io/hmc-smc-portal-ui-demo/ — **HTTP 200**, new bundle `assets/index-Chdlbfw5.js` (was `index-CLAZ6KMW.js` at `4655251`), `manifest.webmanifest` 200.

## 6. Rollback commit
`4655251`. Roll back with: `git push origin 4655251:main --force-with-lease` (frontend bundle only; Supabase untouched).

## 7. Mobile / verification
- **Mock smoke test** (`npm run dev`, port 5173, zero production contact): clean boot, **zero console errors**, login as clinic, opened the intake form, selected Cash → Payment Lines render; the **Visa-FX warning is correctly NOT shown in mock** (confirms the `IS_SUPABASE` guard keeps mock byte-identical); **no horizontal overflow at 390px** on the dense intake form.
- **Live-only restyle** (dashboard masthead, treasury tone cards, config tap targets): validated by the green **supabase+Pages build** + the design-agent's line-precise plan + code review. A non-mutating live browser view was attempted but the available demo credentials (`admin@portal.test`) were rejected by the live project, so live pixel-UAT is owner-side (§8).
- Prior sprints already verified the live tables/shore/bottom-nav are responsive; the mobile sweep found only the cash-grid + two sub-44px targets, both fixed.

## 8. Remaining issues / deferred
**Frontend-safe, not done this pass (optional next):**
- A fuller "operations strip" (date + facility filter) on the live dashboard — the masthead is the conservative first step; extending it can wire the existing range/date state.
- A shared compact `KpiCard` `dense` variant / `SectionHeader` accent-bar prop, and an app-wide 44px tap-target utility — all touch shared primitives, so they're a separate owner-approved design-system task (the className/in-component overrides this sprint achieve ~90% without that risk).
- Secondary `h-8`/`h-9` action buttons across config remain below 44px (low priority, desktop-leaning, in already-wrapped rows).

**Owner-approval-gated (unchanged, untouched):** Master Sheet / Old Cases / mail-CSV import · Invoice Manager + Claude write-back · migration `028` treasury handover · service-catalog seed · migration `025` · billing-prep schema (GOP/FGOP, approved amount, discount history, collection status, structured invoice status) · role-based read-only in the live workspace (auth/RLS) · service worker · destructive SQL / auth-RLS / hmc-v2 / billing-engine.

**Verification gap:** live dashboard visual UAT needs the owner's real Supabase login (demo creds rejected this session).

## 9. Owner UAT (quick)
Log in live as admin → **Dashboard**: masthead header + grouped "Operations"/"Financial mix" KPIs; **Treasury** cards are colour-distinct (green cash / amber excess / sky cash-drawer / navy visa) with amount-first rows and "N collections · CUR" sub-labels + the "no cross-currency" chip; Quick Access is a tight tile rail; CTAs are pill buttons. **Intake** (Insurance): leave the reference blank with an insurer chosen → soft "(pending)" hint appears. **Cash with a Visa line** missing its FX rate → amber "FX rate required" notice. **Case workspace on a phone**: cash-invoice Amount+Currency side-by-side with full-width Save; remove buttons are comfortably tappable. Check 390/430/768 — no horizontal scroll.

## 10. Next recommended step
Owner visual UAT of the live dashboard (§9). If the lighter look lands well, extend the masthead into the optional operations strip and consider the shared-primitive `dense`/tap-target design-system task (owner-approved). All billing/import items remain gated and scoped in the consolidation report §12.
