# NCA Bulk Email Console — Front End

React + Vite + TypeScript scaffold for the NCA Bulk Email as a Service browser console, built
against `NCA_Bulk_Email_Frontend_Process_Flow_2.md` (derived from the project's Inception
Report, §2.2.6 and §6). Frontend only — every write goes through `services/` to an authenticated
backend API; this app never sends email itself.



## Structure

```md
src/
├── assets/              Images, icons, branding
├── components/
│   ├── layout/           AppLayout, Topbar, Sidebar (5 nav groups + Dashboard, role-gated)
│   └── ui/                Card, StatusBadge, QuotaBar — pure, reusable
├── config/
│   └── constants.ts       Quota thresholds, session timeout, API base URL, locale
├── services/              The backend bridge — one file per domain, all named exports
│   ├── apiClient.ts        fetch wrapper: auth header, 401 → session-expired event
│   ├── authService.ts      Credentials step + MFA step (§1)
│   ├── campaignService.ts  Drafts, submit, deliverability checks (§4, §6, §7, §8)
│   ├── contactService.ts   CRUD, import, consent, data hygiene (§9, §10, §11)
│   ├── analyticsService.ts Dashboard + Analytics aggregation (§3, §12)
│   ├── reportService.ts    Standalone Reports engine (§13)
│   ├── messageService.ts   Message Log (§14)
│   ├── adminService.ts     Quota, Users, Roles, System Status (§15, §16, §21)
│   └── auditService.ts     Audit Log (§17)
├── features/               One folder per sidebar nav group
│   ├── auth/                Login (credentials + MFA)
│   ├── dashboard/
│   ├── campaigns/            Campaign Studio, Scheduler, Deliverability Testing
│   ├── audience/              Contacts & Lists, Consent Centre, Data Hygiene
│   ├── insight/                 Analytics
│   ├── reports/
│   ├── message-log/
│   └── administration/         Quota, Users, Roles, Audit Log, System Status
├── context/
│   └── AuthContext.tsx    React state for the logged-in user + session countdown
└── types/                  One .d.ts per domain + an index.ts barrel
    ├── user.d.ts, campaign.d.ts, contact.d.ts, message.d.ts, report.d.ts, admin.d.ts
```

Every service currently resolves against local mock data via `mockDelay(...)`; each function has
a `// TODO` comment showing the exact `apiClient.*` call to swap in once a backend is connected.

## Getting started

```bash
npm install
npm run dev        # start local dev server
npm run build       # type-check and produce a production build
npm run preview     # serve the production build locally
```

On first load you'll land on a login screen. Enter any email + password, then any 6-digit code
at the MFA step — this is a front-end-only scaffold with no real identity provider. Pick an
access profile to see how navigation changes per role.

## Wiring up a real backend

1. Set `VITE_API_BASE_URL` (see `.env.example`) to the platform's API base URL.
2. In each `services/*.ts` file, replace the `mockDelay(...)` mock body with the `apiClient.*`
   call given in the adjacent `// TODO` comment, using an OAuth 2.0 bearer token or scoped API
   key (`services/apiClient.ts` already attaches it to the `Authorization` header once
   `authService` calls `setAuthToken`).
3. Replace the demo credentials/MFA check in `services/authService.ts` with calls to your real
   identity provider, and drop the role picker in `features/auth/Login.tsx`.

## A note on structure

This mostly follows the requested layout, with two deliberate deviations:

- **`Sidebar.tsx` stays under `components/layout/`** alongside `AppLayout`/`Topbar` rather than
  flat in `components/`, since all three only make sense together and share `AppLayout.css`'s
  grid. Flattening it would separate closely-coupled layout pieces for no benefit.
- **`services/` and `types/` each have a few more files than the three examples given** —
  `reportService.ts`/`report.d.ts`, `messageService.ts`/`message.d.ts` and `auditService.ts`
  exist because Reports, Message Log and Audit Log are each their own sidebar nav item and
  scope-approved module (see the flow doc's status note), not sub-cases of `adminService`.
  Splitting them keeps each service file mapped 1:1 to a feature folder.

## Design system

Colors, type and the corner-tick "registration mark" motif on cards are defined in
`src/styles/tokens.css` — deliberately drawn from NCA's own world as a construction/engineering
authority (blueprint blue, drawing-paper background) rather than a generic SaaS look.
