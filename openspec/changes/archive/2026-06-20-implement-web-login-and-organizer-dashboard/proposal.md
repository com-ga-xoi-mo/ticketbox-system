## Why

TicketBox has a working backend (`identity-access` with JWT auth, role model `AUDIENCE|ORGANIZER|CHECKIN_STAFF|ADMIN`) and a check-in mobile app, but no web portal for the people who run the business — organizers and admins. They need a browser surface to sign in and see their concerts at a glance. We start with the shared sign-in and the organizer's overview dashboard, building the app shell so the admin surface can be added later by extending configuration, not by restructuring.

## What Changes

- Introduce a new web workspace `apps/web/` (`@ticketbox/web`): React 18 + Vite 5 + TypeScript + Tailwind CSS v3 (pinned) + React Router v6 + TanStack Query v5, following the `apps/checkin-mobile` conventions (tsconfig extends `tsconfig.base.json`; pure-logic tests, `environment: 'node'`, `*.spec.ts`, no jsdom/component render).
- Adopt a single role-gated app serving both ADMIN and ORGANIZER (one login, one shell, sidebar filtered by role decoded from the JWT). The backend already enforces data scope per role; the frontend mirrors it.
- **Shared Login screen**: one form (email + password with show/hide, "Forgot?" link, Sign In, Request Access) wired to the real backend `POST /auth/login` → `{ accessToken }`. Token stored in `localStorage`, decoded client-side for `{ sub, roles }` (UX gating only; the backend re-validates every request). After sign-in, redirect by role (ORGANIZER → `/dashboard`).
- **Organizer Dashboard**: collapsible icon sidebar (Dashboard, Concerts, Seating Maps, Staff, Settings) + content area. A `sidebar-config` declares every menu item with a `roles` flag (Staff marked ADMIN-only and hidden from organizers). An "Overview" section with three stat cards (Total Concerts +trend, concert-status donut Published/Drafts, Tickets Available/Total + sold-out rate), a "Quick Actions" panel (Create Concert, Upload Map, Add Ticket Type — organizer-only), and a "Recent Concerts" table — rendered with **mock data** this change.
- Visual system: "Midnight Venue" theme (near-black `#020617`, surface `#0b1326`, primary `#d0bcff` purple, secondary `#4cd7f6` cyan, tertiary `#fbabff` magenta; Montserrat / Inter / JetBrains Mono; glassmorphic, rounded), transcribed from the Stitch design.
- Add root `package.json` scripts: `dev:web`, `verify:web`.

Out of scope (declared but not built): admin dashboard, the Staff/Concerts/Seating destination pages, and real APIs for dashboard numbers. Quick Actions and sidebar items navigate only; their targets come in later changes.

## Capabilities

### New Capabilities

- `web-auth`: Shared web sign-in — authenticate against the backend, persist/restore the JWT session, decode roles for UX gating, and redirect by role after login.
- `web-app-shell`: Role-gated application shell — protected routing, a `sidebar-config` filtered by the current role, and the collapsible sidebar/layout that hosts feature pages.
- `web-organizer-dashboard`: The organizer overview surface — stat cards, concert-status donut, recent-concerts table, and organizer-only Quick Actions (mock data this change).

### Modified Capabilities

- (none) — this change consumes the existing backend `identity-access` / `auth-login` contract without changing any backend requirement.

## Impact

- **New**: `apps/web/` workspace (app scaffold, shared API client, auth layer, app shell, login feature, organizer dashboard feature, pure-logic tests).
- **Modified**: root `package.json` (add `dev:web`, `verify:web`); npm workspaces already cover `apps/*`.
- **Consumed (unchanged)**: backend `POST /auth/login` → `{ accessToken }`; JWT payload `{ sub, roles }`; role enum `AUDIENCE|ORGANIZER|CHECKIN_STAFF|ADMIN`.
- **Design source**: Stitch project `16495803249217811754` ("TicketBox Admin Portal Design", Midnight Venue) — login `18274625425038145142`, organizer dashboard `89a540463a394994aae2e3ab5a76de03` ("Operations Dashboard (Midnight Venue Theme)").
- **No breaking changes.**
