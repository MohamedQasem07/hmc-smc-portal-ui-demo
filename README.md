# HMC / SMC Clinic Portal — UI / UX Demo

A live, browsable **UI/UX prototype** of a premium clinical operations Portal for HMC and SMC.

> ⚠️ **This is a UI demo only.** Every record in the application is invented mock data. There is **no backend, no database, no authentication, no real patient information, and no production connection**. Identifiers use a `DEMO-*` prefix throughout.

## What's in the demo

The "Aegis" design system applied to a complete admin operations workspace:

- **Premium Admin Dashboard** — executive cockpit with KPIs, branch leaderboard, cash collection summary
- **Admin Control Center** — configuration of facilities, clinics, users, currencies, insurance workflow statuses
- **+ New Case** — admin-side case registration with `Open Insurance Case Under: HMC / SMC` selector
- **Repatriation Entry** — admin-only minimal flow, multi-currency
- **Cases Master** — unified table across all mock sources with inline status editing
- **Case Detail** — full per-case workspace including settlement recording
- **Collections & Treasury Overview** — per-currency operational summary (no exchange conversion)
- **Daily and Monthly Reports** — printable
- **Legacy Master Sheet Review** — UI concept only, mock placeholders
- **Protected Invoice Manager** — placeholder card explaining the protected billing module

## Live demo

Once deployed to GitHub Pages, the live URL will be available from the **About** section of this repository.

Start at the **Admin Dashboard** — every other module is accessible from the sidebar.

## Run it locally

```bash
git clone https://github.com/<owner>/hmc-smc-portal-ui-demo.git
cd hmc-smc-portal-ui-demo
npm install
npm run dev
```

Then open <http://localhost:5173/design-preview/admin-dashboard>.

## Stack

- React 18 + Vite 5
- Tailwind CSS 3
- React Router 6 (HashRouter on GitHub Pages, BrowserRouter locally)
- lucide-react

No state library. No API client. No environment variables. No production endpoints.

## What this demo is NOT

- Not a production app
- Not connected to any database
- Not connected to any insurance system
- Not connected to any billing engine
- Not connected to any PDF generator
- Not connected to any patient records system

Every visible patient name, insurance reference, hotel, and amount is invented for design review.

## License

Internal demo — for client review only.
