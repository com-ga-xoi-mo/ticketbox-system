## 1. App scaffold & workspace

- [x] 1.1 Create `apps/web/` with `package.json` named `@ticketbox/web`; deps: **`react@^18` + `react-dom@^18`** (match `apps/checkin-mobile`), `react-router-dom@^6`, `@tanstack/react-query@^5`; devDeps: `vite@^5`, `@vitejs/plugin-react`, `typescript`, **`tailwindcss@^3`** (pinned — do NOT install v4), `postcss`, `autoprefixer`, `vitest`; scripts: `dev`, `build`, `typecheck`, `test`, `verify` (mirror `apps/checkin-mobile`)
- [x] 1.2 Add `vite.config.ts` (react plugin) + `index.html` + `src/main.tsx` entry
- [x] 1.3 Add `tsconfig.json` extending `../../tsconfig.base.json` with overrides `jsx: "react-jsx"`, `lib: ["ES2022","DOM","DOM.Iterable"]`, `moduleResolution: "bundler"`, `types: ["node","vitest/globals"]`, `noEmit: true`, `ignoreDeprecations: "5.0"`; add `tsconfig.test.json` used by `typecheck`; add `src/vite-env.d.ts` (`/// <reference types="vite/client" />`)
- [x] 1.4 Configure Tailwind v3: `tailwind.config.ts` transcribing the "Midnight Venue" tokens (charcoal-bg `#020617`, surface `#0b1326`, primary `#d0bcff`, secondary `#4cd7f6`, tertiary `#fbabff`, error `#ffb4ab`, plus the surface/on-surface scale; fontFamily Montserrat/Inter/JetBrains Mono; fontSize, borderRadius `0.5rem`, spacing; `darkMode: "class"`, content globs) + `postcss.config.cjs` + `src/styles/global.css` with base directives and glass/gradient helpers
- [x] 1.5 Load fonts (Montserrat, Inter, JetBrains Mono) and Material Symbols via `index.html` stylesheet links
- [x] 1.6 Add app-local `vitest.config.mts` (`environment: 'node'`, `include: ['src/**/*.spec.ts']`) — same as `checkin-mobile`
- [x] 1.7 Add `dev:web` and `verify:web` scripts to root `package.json` (workspaces already cover `apps/*`)
- [x] 1.8 Verify the app boots (`vite`), `npm run verify:web` passes, and root `lint`/`typecheck`/`test` still pass

## 2. Shared API client

- [x] 2.0 Add `apps/web/.env.example` with `VITE_API_BASE_URL=http://localhost:3000` (the API has no global prefix and listens on port 3000); document it in the app README/comment
- [x] 2.1 Implement `src/shared/api/client.ts`: base URL from `VITE_API_BASE_URL` (default `http://localhost:3000`), JSON helpers, and attach `Authorization: Bearer <token>` when a session token exists
- [x] 2.2 Centralize `401`: clear stored session and invoke a registered unauthorized handler (`registerUnauthorizedHandler`) that redirects to `/login`
- [x] 2.3 Expose typed request helpers (get/post) reused by features

## 3. Shared auth layer

- [x] 3.1 Implement `src/shared/auth/token-storage.ts` (localStorage get/set/clear under one key)
- [x] 3.2 Implement `src/shared/auth/jwt-decode.ts` reading `{ sub, roles }` (Role = `AUDIENCE|ORGANIZER|CHECKIN_STAFF|ADMIN`) with no signature verification; return null on missing/garbage token
- [x] 3.3 Implement `AuthContext` + `AuthProvider`: restore session from stored token on startup, expose `session`, `login(token)`, `logout()`; implement `useAuth()`
- [x] 3.4 Implement role-access pure functions in `src/shared/auth/role-access.ts`: `canAccess(session, allowedRoles)` and `redirectFor(session)` with precedence `ADMIN > ORGANIZER` (ADMIN → `/dashboard`, ORGANIZER → `/dashboard`, neither → `/no-access`); implement `ProtectedRoute` so authenticated-but-unpermitted users go to `/no-access` (NOT `/login`)
- [x] 3.6 Build `src/features/auth/AccessDeniedPage.tsx` (`/no-access`): explains the account lacks web-portal access and offers a Logout action (calls `useAuth().logout`)
- [x] 3.5 Build shared UI primitives in `src/shared/ui/` used by login + shell (Input with icon, Button with loading state, FieldError)

## 4. App shell & routing

- [x] 4.1 Implement `src/app/sidebar-config.ts`: declarative items with `roles` flags matching the Stitch "Operations Dashboard" sidebar (Dashboard/Concerts/Seating Maps/Settings → `[ORGANIZER, ADMIN]`; Staff → `[ADMIN]`) + a pure `visibleItems(role)` filter
- [x] 4.2 Implement collapsible sidebar layout (`src/shared/ui/Sidebar` / shell) consuming `visibleItems`, with expand/collapse (icon mode) and active-item highlight
- [x] 4.3 Implement `src/app/providers.tsx` wiring `QueryClientProvider` + `AuthProvider`
- [x] 4.4 Implement `src/app/router.tsx`: `/login` (public), `/dashboard` (protected, `[ORGANIZER, ADMIN]`), `/no-access` (authenticated, any role), default redirects (unauth → `/login`, authed → `redirectFor(session)`); mount in `src/app/App.tsx`

## 5. Login feature (shared)

- [x] 5.1 Build `src/features/auth/api.ts` with `login({ email, password })` → `POST /auth/login` returning `{ accessToken }`
- [x] 5.2 Build `src/features/auth/useLogin.ts` TanStack Query mutation (loading/error states)
- [x] 5.3 Build `src/features/auth/login-validation.ts` (pure): valid email, non-empty password, `hasErrors`
- [x] 5.4 Build `src/features/auth/LoginPage.tsx` matching the Stitch login (two-panel: brand panel with logo + "TicketBox" + tagline "Manage concerts from stage to gate." + bar-chart decoration, hidden on mobile; form panel with email `admin@ticketbox.com` + password with show/hide toggle, "Forgot?" placeholder link, Sign In + arrow, "Request Access" placeholder link); wire validation + `useLogin`
- [x] 5.5 On success store token via `AuthContext.login` and navigate via `redirectFor(session)`; on `401` show "Invalid credentials. Please try again."; show loading and prevent double-submit; call `registerUnauthorizedHandler` on mount
- [x] 5.6 Redirect already-authenticated users away from `/login` to their role destination

## 6. Organizer dashboard feature (mock data)

- [x] 6.1 Build `src/features/dashboard/mock-data.ts` (typed) for stat values, concert-status breakdown, and recent concerts — shaped to the eventual API fields
- [x] 6.2 Build the stat-card presentation (`label`, `value`, optional `trend`) inline within `OrganizerDashboard.tsx` (no separate `StatCard` component file)
- [x] 6.3 Build the "Overview" stat-card row (Total Concerts +trend, concert-status Published/Drafts, Tickets available/total + Sold-Out Rate) from mock data
- [x] 6.4 Build concert-status donut + "Recent Concerts" table (Name/Date/Venue/Status/Actions) from mock data
- [x] 6.5 Build organizer-only "Quick Actions" panel (Create Concert, Upload Map, Add Ticket Type) as navigation controls (no destination pages)
- [x] 6.6 Compose `src/features/dashboard/OrganizerDashboard.tsx` inside the shell at `/dashboard`, matching the Stitch "Operations Dashboard (Midnight Venue Theme)" layout (header search/role/avatar, Overview, Quick Actions, Recent Concerts)

## 7. Tests & verification (pure-logic, `environment: 'node'`, `*.spec.ts` — no jsdom/component render)

- [x] 7.1 `token-storage.spec.ts`: set/get/clear round-trip; missing token returns null
- [x] 7.2 `jwt-decode.spec.ts`: extract `{ sub, roles }` from a valid token; handle missing/garbage without throwing
- [x] 7.3 `role-access.spec.ts`: `canAccess` (allowed vs denied roles, null session); `redirectFor` precedence — ADMIN → `/dashboard`, ORGANIZER → `/dashboard`, ADMIN+ORGANIZER → `/dashboard`, CHECKIN_STAFF/AUDIENCE/empty → `/no-access`
- [x] 7.4 `sidebar-config.spec.ts`: `visibleItems('ORGANIZER')` excludes Staff; `visibleItems('ADMIN')` includes it
- [x] 7.5 `login-validation.spec.ts`: blocks invalid email / empty password; passes valid input
- [x] 7.6 `client.spec.ts`: attaches `Authorization: Bearer <token>` when present; no header without token; on `401` clears session and invokes the unauthorized handler (mock fetch)
- [x] 7.7 Visually verify `LoginPage` and `OrganizerDashboard` against the Stitch screenshots (layout, colors, typography); run `npm run verify:web` + root `lint`/`typecheck`/`test` clean
