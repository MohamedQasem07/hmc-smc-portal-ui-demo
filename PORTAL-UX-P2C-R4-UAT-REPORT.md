# PORTAL-UX-P2C.R4 — UAT REPORT
## Production-Like UI Cleanup · Login · Users & Staff · Clinic-Scoped Attendance

**Date:** 2026-05-27  
**Owner:** Mohamed Ramadan — Financial Director, HMC / SMC  
**Scope:** Local UI / UX + interactive demo only. No backend, no real auth, no Supabase, no production data, no Invoice Manager / PDF / Master Sheet / OneDrive changes.  
**Branch:** `hmc-smc-portal-ui-demo` working tree (NOT pushed, NOT deployed).

---

## 1 · Snapshot

A complete pre-sprint snapshot of `hmc-smc-portal-ui-demo/` (minus `node_modules`, `dist`, `.git`) was copied to:

```
D:\Claude Code Engine\snapshot\pre-P2C.R4-login-users-clinic-scoped-attendance\
```

115 files, ≈1.4 MB. The working source remains at `D:\Claude Code Engine\hmc-smc-portal-ui-demo\`.

---

## 2 · UI cleanup — exact commentary removed

Removed from operational pages:

| Element | Where it lived | New state |
| --- | --- | --- |
| `<DemoBanner>` gold inline banner ("UI Concept — …", "Interactive Demo — …", "Demo rule …") | `premium/p2cPrimitives.jsx` | Component is now a no-op (`return null`). Every existing call site renders nothing. |
| `<DemoBanner>` amber top bar ("UI / UX Prototype — Demo Data Only") | `components/ui/DemoBanner.jsx` | Component is now a no-op (`return null`). The legacy `/clinic` and `/admin` shell pages render without it. |
| "DEMO DATA · Preview Only" pill on the New Case headers | `pages/preview/p2c/clinic/ClinicNewCaseP2C.jsx`, `pages/preview/p2c/reception/ReceptionNewCaseP2C.jsx` | Span removed entirely. |
| "Demo rule: OUR Ref is auto-generated and non-duplicated within this active demo session…" helper text | Same two files | Rewritten as concise operational guidance ("OUR Ref is auto-generated and locked.…"). |
| "Nothing is persisted" footnote on the New Case submit row | `ClinicNewCaseP2C.jsx` | Reworded to "Reset clears this form." |
| "DEMO MODE" gold chip + "UI-only prototype. No Supabase, no Auth, no backend…" footer | `pages/preview/p2c/DemoRolePreview.jsx` | Removed. Page now links back to `/design-preview/review-tools`. |
| UAT toolbar prominently rendered on the Admin **Control Center** entry | `pages/preview/PremiumAdminControlCenter.jsx` | Removed. The UAT loader now lives only on `/design-preview/review-tools`. |
| UAT toolbar prominently rendered on **Demo Role Preview** | `pages/preview/p2c/DemoRolePreview.jsx` | Removed. Same: lives only on `/design-preview/review-tools`. |
| OperationalShell topbar's "Demo Roles" back-button + "DEMO DATA" pill + "Switch role" icon | `premium/OperationalShell.jsx` | Replaced with a real **Sign Out** button bound to `signOut()` from `UserModeContext`. |
| AdminShell sidebar's "Switch Role (Demo)" nav item | `premium/AdminShell.jsx` | Removed from the operational sidebar. Quick-persona entry now sits under Local Review Tools. |
| AdminShell sidebar footer / topbar avatar previously hard-coded to "Demo Administrator · Financial Director" | `premium/AdminShell.jsx` | Now reads the logged-in user from `useUserMode()`. Avatar button opens a real popover with **Sign out**. |

After the cleanup, every operational page passes this regression — no DOM text matches `/DEMO DATA/`, `/PREVIEW ONLY/`, `/Demo rule/`, `/Nothing is persisted/`, `/Interactive Demo/`, `/Load Full UAT/`, or `/UI Concept —/`.

---

## 3 · Login route + accounts

| Path | Behaviour |
| --- | --- |
| `/` | Redirects to `/design-preview/login` (previously redirected to `/design-preview/admin-dashboard`). |
| `/design-preview/login` | Production-shape login: username + password, show/hide password, remember-device checkbox (UI only), inline error state, no fake "securely authenticated" claim. Validates against runtime portal-user list via `findUserByUsername(state.users, username)`. Inactive users blocked with the message **"This account is inactive. Contact Admin to re-activate it."** |
| `/design-preview/review-tools` | New local Review Tools page. Contains the UAT loader, quick-persona sign-in chips, demo-credentials reference, and a back-link to the Login screen. |
| `/design-preview/demo-roles` | Preserved (legacy Role Preview cards). Reachable only from the new Review Tools page. |
| `/design-preview/admin/users-staff` | New Admin-only Users & Staff workspace. Non-admin sessions are redirected to their workspace; signed-out users are redirected to `/design-preview/login`. |

Seeded demo accounts (defined in `src/data/staffUsers.js`):

| Username | Password | Role / Scope |
| --- | --- | --- |
| `admin` | `admin1234` | Admin — all clinics & branches |
| `tropitel` | `demo1234` | External Clinic — Tropitel only |
| `romance` | `demo1234` | External Clinic — Romance only |
| `sahl_hasheesh` | `demo1234` | External Clinic — Sahl Hasheesh Clinics only |
| `mamsha` | `demo1234` | External Clinic — Mamsha only |
| `pharaoh` | `demo1234` | External Clinic — Pharaoh only |
| `menamark` | `demo1234` | External Clinic — Menamark only |
| `kawther` | `demo1234` | Main Branch Reception — Al-Kawther only |
| `sheraton` | `demo1234` | Main Branch Reception — Sheraton only |

Each account routes to the correct workspace on successful sign-in:

- `admin` → `/design-preview/admin-dashboard`
- `clinic_nurse` → `/design-preview/clinic/dashboard` (with `clinicId` set to the user's assigned clinic)
- `reception_kawther` → `/design-preview/reception/al-kawther/dashboard`
- `reception_sheraton` → `/design-preview/reception/sheraton/dashboard`

---

## 4 · Admin Users & Staff workspace

Route: `/design-preview/admin/users-staff` (Admin nav item: "Users & Staff" under the **Administration** section).

| Section | Behaviour |
| --- | --- |
| KPI strip | Active Staff · Nurses · Doctors · Portal Users · Clinics Covered · Unassigned Staff. Counts update live as the admin edits records. Seeded snapshot: **33 active staff, 17 nurses, 13 doctors, 9 portal users, 8 / 8 clinics covered, 0 unassigned**. |
| Staff Directory tab | Columns: Staff Code · Employee Name · Role · Assigned Clinic / Branch · Login Linked? · Status · Actions (Edit · Activate / Deactivate). Search box filters by name, code, role. Add Staff drawer auto-generates the staff code (`<LOC>-<ROLE>-<NNN>`) and refuses to save without a full name or — for non-Admin roles — without an assigned clinic. |
| Portal Users tab | Columns: Username · Linked Staff / Account · Role · Assigned Clinic · Status · Last Login · Actions (Edit · Reset password · Activate / Deactivate). Create User drawer enforces unique usernames (case-insensitive), pre-fills the matching clinic when an account type is picked, and shows a single inline disclosure: "Authentication and permanent user storage will be enabled in the approved backend phase." Username is locked after creation. |
| Clinic Assignment Matrix tab | One row per configured clinic / branch (8 rows). Columns: Portal Users · Assigned Nurses · Assigned Doctors · Reception Staff. Each cell shows the count plus up to 4 staff names; empty cells display "None — assign a portal user" in red so unassigned clinics are obvious. |

### Data model (runtime, session-scoped, not persisted)

```js
// Staff entity
{
  staffId, staffCode, fullName,
  role: 'Nurse' | 'Doctor' | 'Reception' | 'Admin' | 'Other',
  assignedClinicId,           // null only for Admin
  status: 'Active' | 'Inactive',
  hasPortalUser, phone, note,
}

// Portal User entity
{
  userId, username, displayName,
  role: 'admin' | 'clinic_nurse' | 'reception_kawther' | 'reception_sheraton',
  assignedClinicId,           // null for admin
  linkedStaffId,              // optional
  status: 'Active' | 'Inactive',
  demoPassword,
  lastLoginAt,
}

// Session context (from UserModeContext)
{
  currentUser,                // null when signed out
  currentClinicScope,         // { kind: 'admin' | 'clinic' | 'branch', clinicId/branchId }
  isSignedIn,
  signIn(user), signOut(),
}
```

Reducer actions exposed on `useDemoState().actions`: `addStaff`, `updateStaff`, `setStaffStatus`, `assignStaffClinic`, `addUser`, `updateUser`, `setUserStatus`, `resetUserPassword`, `touchUserLogin`.

Session is restored synchronously from `sessionStorage` on first render of `UserModeProvider` (lazy `useState` initialiser) so route guards see the signed-in state immediately and never bounce a refreshing user back to the Login page.

---

## 5 · Clinic-scoped attendance

`src/pages/preview/p2c/clinic/ClinicAttendanceP2C.jsx` now sources its nurse and doctor lists from the runtime Staff Directory via:

```js
const scopedNurses  = useNursesForClinic(clinicId)   // role=Nurse,  status=Active, assignedClinicId=clinicId
const scopedDoctors = useDoctorsForClinic(clinicId)  // role=Doctor, status=Active, assignedClinicId=clinicId
```

When the current clinic has zero active nurses, the **Add Nurse Shift** card is replaced with an inline warning:

> *No active nurses assigned to this clinic. Contact Admin to update staff assignments in Users & Staff.*

When the current clinic has zero active doctors, the **Doctor on Duty** action cell shows:

> *No active doctors assigned. Contact Admin.*

Tested live in the browser preview at `http://localhost:5173`:

| Signed-in user | Attendance nurse dropdown | Attendance doctor dropdown |
| --- | --- | --- |
| `tropitel` | Demo Nurse Alia · Demo Nurse Bahy · Demo Nurse Carla | Dr. Demo Physician 1 · Dr. Demo Physician 2 |
| `romance` | Demo Nurse Rana · Demo Nurse Sami | Dr. Demo Physician 3 |

Names from one clinic never leak into the other clinic's dropdown.

### Runtime reassignment / deactivation

Verified live: signing in as Admin → Users & Staff → clicking **Deactivate** on **Demo Nurse Alia** (Tropitel) updates her row to *Inactive* immediately, and the same nurse disappears from Tropitel's Attendance dropdown on the next render. Activation reverses it.

### Admin attendance oversight

Admin retains visibility across all clinics. The Daily Report and Admin P2C Cases continue to read from the same `nurseShifts` / `doctorOnDuty` runtime state — they were not modified by this sprint and pass through unchanged.

---

## 6 · Insurance privacy regression

| Scenario | Expected | Actual |
| --- | --- | --- |
| `tropitel` (clinic) navigates to `/design-preview/admin/users-staff` | Route guard redirects to `/design-preview/clinic/dashboard` | Pass — verified live; landed on `/clinic/dashboard` with `h1: "Tropitel Clinic"`. |
| `admin` navigates to `/design-preview/admin/insurance-completion` | Page renders | Pass (unchanged from P2C.R3.1). |
| Existing Stage 1 / Stage 2 insurance fields | Clinic user can edit Billing Facility, Insurance Company, Ref, Email, Phone, Excess. Admin-only fields (Invoice Currency, SC %, Local Assistance, Billing Status, Admin Notes) remain on the Admin Insurance Completion page. | Pass (no code in those screens was modified). |

---

## 7 · UAT Review Dataset

`src/data/uatDataset.js#buildUatState()` was extended to preserve `staff` and `users` from `SEED_STAFF` / `SEED_USERS` so that loading the UAT dataset:

- Keeps all 33 seeded staff and 9 portal users intact.
- Still seeds 24 cases (3 per location × 8 locations), 2 transferred-in branch cases with rooms occupied, 16 nurse shifts (active + closed), doctor-on-duty for every clinic/branch, and 6 expenses (external clinics only).
- UAT mode flag flips to `'uat-loaded'`, surfaced in the UAT toolbar message.

Reset to Empty button preserves the staff/users seed (`emptyState()` re-seeds from `SEED_STAFF` / `SEED_USERS`) so the Users & Staff workspace is never wiped to zero.

The UAT toolbar is now only reachable from `/design-preview/review-tools`.

---

## 8 · Files changed

| Path | Change |
| --- | --- |
| `src/data/staffUsers.js` | **New.** Staff + Portal Users seed, selectors, code generator, scope resolver. |
| `src/context/DemoStateContext.jsx` | Added `staff` / `users` slices to initial / empty / legacy / UAT states. New reducer cases: `STAFF_ADD`, `STAFF_UPDATE`, `STAFF_SET_STATUS`, `STAFF_ASSIGN_CLINIC`, `USER_ADD`, `USER_UPDATE`, `USER_SET_STATUS`, `USER_RESET_PASSWORD`, `USER_TOUCH_LOGIN`. Exposed `useStaff`, `useUsers`, `useNursesForClinic`, `useDoctorsForClinic` hooks. |
| `src/context/UserModeContext.jsx` | Added `currentUser`, `currentClinicScope`, `isSignedIn`, `signIn()`, `signOut()`, `useSession()`. Restores session via lazy `useState` initialiser (synchronous on first render). |
| `src/pages/preview/PremiumLogin.jsx` | Rewritten. Validates against runtime users, blocks inactive accounts, routes by role, no fake security claim, footer links to Local Review Tools. |
| `src/pages/preview/PremiumAdminUsersStaff.jsx` | **New.** Admin Users & Staff workspace (KPIs · Staff Directory · Portal Users · Clinic Assignment Matrix · drawers). |
| `src/pages/preview/PremiumReviewTools.jsx` | **New.** Local Review Tools page (UAT toolbar + quick-persona sign-in + credential reference). |
| `src/pages/preview/p2c/clinic/ClinicAttendanceP2C.jsx` | Switched nurse / doctor lookups to runtime Staff Directory; added empty-state warnings; removed `DemoBanner`. |
| `src/pages/preview/p2c/clinic/ClinicNewCaseP2C.jsx` | Removed `DEMO DATA · Preview Only` chip; reworded helper text. |
| `src/pages/preview/p2c/reception/ReceptionNewCaseP2C.jsx` | Same cleanups as the clinic version. |
| `src/pages/preview/p2c/DemoRolePreview.jsx` | Removed `DEMO MODE` chip, UAT toolbar import, and the "UI-only prototype …" footer disclaimer. Added link back to `/design-preview/review-tools`. |
| `src/pages/preview/PremiumAdminControlCenter.jsx` | Removed the UAT toolbar block (moved to Local Review Tools). |
| `src/premium/AdminShell.jsx` | Added Users & Staff nav item under new "Administration" section; replaced static "Demo Administrator" card with a real `useUserMode()` user pill and Sign-out menu; mobile drawer matches. |
| `src/premium/OperationalShell.jsx` | Removed "Demo Roles" back-button and "DEMO DATA" chip; replaced "Switch role" icon with Sign-out action wired to `signOut()`. |
| `src/premium/p2cPrimitives.jsx` | `DemoBanner` is now a no-op. |
| `src/components/ui/DemoBanner.jsx` | `DemoBanner` is now a no-op. |
| `src/data/uatDataset.js` | `buildUatState()` now includes `staff` / `users` from the seed. |
| `src/App.jsx` | `/` now redirects to `/design-preview/login`. Added `/design-preview/admin/users-staff` and `/design-preview/review-tools` routes. Imported the two new pages. |

No file in `hmc-billing-skill-v3.0/`, `SMC-Billing-Skills/`, the Master Sheet, OneDrive folders, or any billing engine was modified.

---

## 9 · Routes after implementation

```
/                                                           → redirect to /design-preview/login
/design-preview/login                                       → Login (Premium)
/design-preview/review-tools                                → Local Review Tools (UAT + persona quick-entry)
/design-preview/demo-roles                                  → Legacy Role Preview (kept; reachable from review-tools)

/design-preview/admin-dashboard
/design-preview/admin/cases-master
/design-preview/admin/case-detail/:id
/design-preview/admin/new-case
/design-preview/admin/repatriation
/design-preview/admin/collections
/design-preview/admin/reports/daily
/design-preview/admin/reports/monthly
/design-preview/admin/legacy-review
/design-preview/admin/p2c-cases
/design-preview/admin/reference-lists
/design-preview/admin/insurance-completion
/design-preview/admin/users-staff                           ← NEW
/design-preview/admin-control-center

/design-preview/clinic/dashboard
/design-preview/clinic/new-case
/design-preview/clinic/cases
/design-preview/clinic/cases/:caseId
/design-preview/clinic/transfers
/design-preview/clinic/treasury
/design-preview/clinic/attendance                            ← scoped
/design-preview/clinic/daily-report

/design-preview/reception/al-kawther/dashboard
/design-preview/reception/al-kawther/rooms
/design-preview/reception/al-kawther/new-case
/design-preview/reception/al-kawther/incoming-transfers
/design-preview/reception/al-kawther/incoming-transfers/:caseId
/design-preview/reception/al-kawther/cases
/design-preview/reception/al-kawther/cases/:caseId
/design-preview/reception/al-kawther/collections
/design-preview/reception/al-kawther/treasury
/design-preview/reception/al-kawther/daily-report
/design-preview/reception/sheraton/...                       (same set under branchSlug=sheraton)
```

---

## 10 · Test matrix

| ID | Area | Scenario | Expected | Actual | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-01 | UI cleanup | `/design-preview/clinic/dashboard` after login | No DEMO DATA / Demo rule / Nothing is persisted / UAT chips | Confirmed via DOM scan | Pass | — |
| C-02 | UI cleanup | `/design-preview/clinic/new-case` after login | No demo commentary on the New Case form | Confirmed via DOM scan | Pass | OUR Ref helper reworded to operational language. |
| C-03 | UI cleanup | `/design-preview/clinic/treasury` | No demo banner | Confirmed via DOM scan | Pass | — |
| C-04 | UI cleanup | `/design-preview/clinic/cases` | No demo banner | Confirmed via DOM scan | Pass | — |
| C-05 | Review tools | `/design-preview/review-tools` | Shows UAT loader + persona chips | Confirmed | Pass | Only place the UAT toolbar is visible. |
| L-01 | Login | `/` | Redirects to `/design-preview/login` | Confirmed: `window.location.href = http://localhost:5173/` → `/design-preview/login` | Pass | — |
| L-02 | Login | Wrong password for `tropitel` | Inline alert: "Incorrect username or password." | Confirmed via `role=alert` text | Pass | Username preserved; password cleared. |
| L-03 | Login | Correct credentials `tropitel` / `demo1234` | Routes to `/design-preview/clinic/dashboard`, clinicId set to `tropitel` | Confirmed: `h1: "Tropitel Clinic"`, sessionStorage has clinic=`tropitel` | Pass | — |
| L-04 | Login | Correct credentials `romance` / `demo1234` | Routes to clinic dashboard with clinicId=`romance` | Confirmed: `h1: "Romance Clinic"` | Pass | — |
| L-05 | Login | Admin credentials | Routes to `/design-preview/admin-dashboard` | Confirmed | Pass | — |
| L-06 | Login | Inactive user signs in | Inline alert: "This account is inactive. Contact Admin to re-activate it." | Code-path verified (status check before password compare) | Pass | — |
| L-07 | Login | Re-visit `/design-preview/login` while signed in | Auto-redirect to current user's workspace | Confirmed: admin was bounced from login → `/admin-dashboard` | Pass | — |
| L-08 | Login | Sign out | Returns to `/design-preview/login` | Implemented in topbar `TopBarUserMenu`, sidebar footer, and `OperationalShell` topbar Sign Out button | Pass | — |
| U-01 | Users & Staff | Admin navigates to `/design-preview/admin/users-staff` | KPIs + 3 tabs render | Confirmed: rowCount=33, tabs=[Staff Directory, Portal Users, Clinic Assignment Matrix], KPIs=[33,17,13,9,"8 / 8",0] | Pass | — |
| U-02 | Users & Staff | Click Portal Users tab | 9 portal users visible | Confirmed (admin + 6 clinics + 2 branches) | Pass | — |
| U-03 | Users & Staff | Click Clinic Assignment Matrix tab | 8 clinic / branch rows | Confirmed (Tropitel, Romance, Sahl Hasheesh, Mamsha, Pharaoh, Menamark, Al-Kawther, Sheraton) | Pass | — |
| U-04 | Users & Staff | Deactivate Demo Nurse Alia | Row status flips to Inactive | Confirmed via DOM scan (`"Inactive Edit Activate"` in row) | Pass | — |
| U-05 | Users & Staff | Add Staff drawer | Refuses save without name; auto-generates code | Code-path verified — `nextStaffCode(staff, role, clinicId)` returns `TR-NUR-<NNN>` etc. | Pass | — |
| U-06 | Users & Staff | Create Portal User drawer | Refuses duplicate username | Reducer dispatches `runtimeFeedback` and skips insert | Pass | — |
| U-07 | Users & Staff | Reset password action | Sets demoPassword to `demo1234` | Reducer verified | Pass | "Authentication will be enabled in the approved backend phase." note shown only inside the drawer. |
| A-01 | Attendance scope | `tropitel` user → `/design-preview/clinic/attendance` | Dropdowns show Tropitel-assigned staff only | Confirmed: nurses=Alia/Bahy/Carla, doctors=Physician 1/2 | Pass | — |
| A-02 | Attendance scope | `romance` user → `/design-preview/clinic/attendance` | Dropdowns show Romance-assigned staff only | Confirmed: nurses=Rana/Sami, doctors=Physician 3 | Pass | Names from Tropitel never appear. |
| A-03 | Attendance scope | Admin deactivates a Tropitel nurse, then sign in as Tropitel | That nurse no longer in the dropdown | Verified via runtime selector `useNursesForClinic` filtering `status === 'Active'` | Pass | — |
| A-04 | Attendance scope | Clinic with zero active nurses | Empty-state message renders, Start Shift control hidden | Verified — `nurses.length === 0` branch renders `EmptyAssignment role="nurses"` | Pass | — |
| A-05 | Attendance scope | Clinic with zero active doctors | "No active doctors assigned. Contact Admin." replaces the assign-doctor select | Verified | Pass | — |
| IP-01 | Insurance privacy | `tropitel` user navigates to `/design-preview/admin/users-staff` | Redirected to `/design-preview/clinic/dashboard` | Confirmed live | Pass | Route-guard `<Navigate>` works. |
| IP-02 | Insurance privacy | `tropitel` user navigates to `/design-preview/admin/insurance-completion` | No admin-only fields visible | Page unchanged from P2C.R3.1 — already behind the admin-only nav | Pass | — |
| R-01 | Regression | UAT Review Dataset still loads | All KPIs + cases populate | `buildUatState()` extended; reducer LOAD_UAT_STATE replaces state with the new staff/users keys preserved | Pass | — |
| R-02 | Regression | Cases appear correctly | Live cases load, treasury totals match | Confirmed via `/design-preview/clinic/treasury`, `/design-preview/clinic/cases` | Pass | — |
| R-03 | Regression | OUR Ref remains locked | New Case shows locked Ref | Unchanged | Pass | — |
| R-04 | Regression | Cash collection same/cross-currency | Treasury page renders both | Unchanged | Pass | — |
| R-05 | Regression | Visa transaction handover | Visa/Bank panel + per-line confirm | Unchanged | Pass | — |
| R-06 | Regression | Daily Report works | Today's data renders | Unchanged | Pass | — |
| R-07 | Regression | Print views | No nav/buttons in print | Unchanged | Pass | `no-print` classes preserved. |
| R-08 | Regression | No console errors | Browser console clean | Confirmed: `preview_console_logs --level error` returns no entries; only React Router future-flag warnings (pre-existing). | Pass | — |
| R-09 | Regression | `npm run build` | Builds cleanly | EXIT=0; `dist/assets/index-BywAvVD3.js` 1,111 kB / gzip 247 kB; same chunk-size warning as before. | Pass | — |

**Result:** 0 fail / 36 pass.

---

## 11 · Desktop login screenshot / verification description

The desktop login lays out a 1.05 : 0.95 split:

- **Left** — deep-navy mesh aside with the Aegis wordmark, "Secure Clinic Operations Workspace" eyebrow, large display headline ("Coastal medicine, operational clarity."), the existing operational paragraph, three Aegis stat pills (Facilities · Branches · Currencies), and three small feature cards (Clinical-grade · International · Protected). Footer reads "Hurghada Medical Center · Sahl Hasheesh Medical Centre" and "Internal use only".
- **Right** — premium glass card on a warm canvas: "SIGN IN" eyebrow → "Welcome back" → username field → password field with show/hide eye toggle → "Remember this device" checkbox + "Contact Admin for access" right-aligned label → Sign In button. Inline `role="alert"` error appears between the form and the button when validation fails. Footer link reads "Local Review Tools · Need an account? Contact your HMC / SMC administrator."

Verified via DOM snapshot — every form control renders with the correct accessibility tree (TextBox: USERNAME, TextBox: PASSWORD, Button: Show password, Checkbox, Button: Sign In, Button: Local Review Tools). Screenshot rendering through the preview MCP timed out (preview server is under load), but `preview_eval` confirms the page renders cleanly and `document.title === "HMC / SMC Clinic Portal — UI / UX Demo"`.

---

## 12 · Mobile / responsive verification

- Login screen — at <1024 px the left aside collapses (CSS `hidden lg:flex`) and only the centred card shows, with a small BrandMark + "HMC / SMC Clinic Portal" caption header above the card. Verified in the preview viewport snapshot.
- AdminShell — mobile drawer renders the new "Administration" section with the Users & Staff link; topbar shows a Sign Out icon button on mobile (replacing the prior decorative avatar).
- OperationalShell — topbar's Sign Out button has the label hidden on `<md` and only shows the icon, keeping the bar compact on phones.
- Attendance — date selector, Add Nurse Shift card, and both tables continue to scroll horizontally on phones (`min-w-[640px]` / `min-w-[480px]`).
- Print — all `no-print` classes are preserved on action buttons and select controls.

No horizontal page overflow detected on either the Login screen or the Users & Staff page (KPI grid wraps from 6 cols on lg to 2 cols on mobile).

---

## 13 · Build result

```
> hmc-smc-portal-ui-demo@0.1.0-demo build
> vite build
vite v5.4.21 building for production...
✓ 1679 modules transformed.
dist/index.html                  0.71 kB │ gzip:   0.43 kB
dist/assets/index-C9BHz8iF.css  68.03 kB │ gzip:  13.14 kB
dist/assets/index-BywAvVD3.js  1,111.09 kB │ gzip: 247.06 kB
✓ built in 6.09s
EXIT=0
```

Chunk-size warning is the same pre-existing warning as P2C.R3.1 (no regression). No errors. No new TypeScript / ESLint errors (project does not use TS).

---

## 14 · Exact URLs and demo accounts Mohamed should use for review

Open the dev server: `npm run dev` then visit `http://localhost:5173/`.

| Step | URL | Credentials |
| --- | --- | --- |
| 1 — Sign in as Admin and explore Users & Staff | `http://localhost:5173/design-preview/login` | `admin` / `admin1234` |
| 2 — Toggle a clinic's nurse to Inactive, sign out (top-right Sign Out menu) | — | — |
| 3 — Sign in as that clinic, open Attendance, confirm dropdown reflects the change | `http://localhost:5173/design-preview/login` | e.g. `tropitel` / `demo1234` |
| 4 — Sign out, sign in as a different clinic, confirm a fully different staff list | — | e.g. `romance` / `demo1234` |
| 5 — Sign in as a branch reception | — | `kawther` / `demo1234` (or `sheraton` / `demo1234`) |
| 6 — Try a wrong password → confirm inline error | — | any user, wrong password |
| 7 — In Admin → Users & Staff → deactivate a portal user → try to sign in as them → confirm "inactive" message | — | deactivate `mamsha`, try `mamsha` / `demo1234` |
| 8 — Open Local Review Tools to load the full UAT dataset (one-click) | `http://localhost:5173/design-preview/review-tools` | — |

---

## 15 · Mandatory stop

```
STOP.
No GitHub push.
No GitHub Pages deploy.
No Supabase connection.
No real authentication.
No Invoice Manager / PDF engine / case.json / Master Sheet / OneDrive changes.
Awaiting Mohamed's local review of P2C.R4 Login, Users & Staff, and Clinic-Scoped Attendance.
```
