## Context

TicketBox is an npm-workspace monorepo. The backend (`packages/backend/src/identity`) already exposes `POST /auth/login` returning `{ accessToken }`, with a JWT payload of `{ sub, roles }` and a role enum `AUDIENCE | ORGANIZER | CHECKIN_STAFF | ADMIN`. There is a React Native check-in app (`apps/checkin-mobile`) whose conventions this change mirrors: tsconfig extends `tsconfig.base.json` with `jsx`/`lib`/`types` overrides, and tests are pure-logic under `environment: 'node'` with `*.spec.ts` (no jsdom/component render).

There is no web portal for organizers or admins. The Stitch design "TicketBox Admin Portal Design" (project `16495803249217811754`) provides the login (`18274625425038145142`) and the organizer dashboard "Operations Dashboard (Midnight Venue Theme)" (`89a540463a394994aae2e3ab5a76de03`) under the "Midnight Venue" theme.

This is a cross-cutting change (new workspace, new build pipeline, auth integration, app shell pattern), so a design doc is warranted.

**Confirmed backend integration facts** (verified in `apps/api/src/main.ts` and `packages/backend/src/identity`):

- Endpoint is `POST /auth/login` — there is **no global prefix** (not `/api/...`). Returns `200 OK` with `{ accessToken }`; returns `401` ("Invalid credentials") on bad credentials.
- `LoginDto` accepts exactly `{ email, password }` (`@IsEmail`, non-empty string). The global `ValidationPipe` uses `forbidNonWhitelisted: true`, so the client MUST send only those two fields (no `rememberMe` etc.) — the login screen has no extra fields, so this holds.
- CORS is enabled with `origin: true`, so the browser app can call the API cross-origin.
- The API listens on port **3000** by default; the Vite dev server runs separately. The web app targets `VITE_API_BASE_URL` (default `http://localhost:3000`).
- JWT payload is `{ sub, roles }`; `roles` is an array (a user may hold multiple roles).

## Goals / Non-Goals

**Goals:**

- Stand up `apps/web/` as a role-gated single app serving ADMIN and ORGANIZER.
- Ship a shared login wired to the real backend, and the organizer dashboard with mock data.
- Make the shell extensible: adding the admin surface later is configuration + new pages, not a restructure.
- Match repo conventions so root `lint`/`typecheck`/`test` stay green.

**Non-Goals:**

- No admin dashboard, and no Staff/Concerts/Seating destination pages.
- No real APIs for dashboard numbers (mock data only); only login hits the backend.
- No backend changes — the `identity-access` contract is consumed as-is.
- No registration / forgot-password flows (links are placeholders this change).

## Decisions

### Decision 1: One role-gated app (Option A), not two apps

A single `apps/web/` serves both roles; the sidebar is filtered by the role decoded from the JWT.

- **Why:** Login, shell, auth, and most pages are ~80% shared. Data scope (organizer sees own concerts, admin sees all) is enforced by the backend on the same endpoints, so the frontend does not need to fork per role. Adding the admin surface later means adding `roles` flags and pages, not a second app.
- **Alternatives considered:** Two separate apps (`admin-web` + `organizer-web`) — rejected: duplicates login/shell/auth/build and doubles maintenance for marginal benefit (only the theme differs, and that can be a token set). A two-route-tree single app (`/admin/*` + `/organizer/*`) — rejected: extra structure without clear payoff over plain role filtering.

### Decision 2: `sidebar-config` as the role-extension point

Navigation is a declarative list; each item carries `roles: Role[]`. The sidebar renders `items.filter(i => i.roles.includes(currentRole))`.

```
Dashboard     [ORGANIZER, ADMIN]
Concerts      [ORGANIZER, ADMIN]
Seating Maps  [ORGANIZER, ADMIN]
Staff         [ADMIN]            ← hidden from organizers
Settings      [ORGANIZER, ADMIN]
```

(These five items match the Stitch "Operations Dashboard" sidebar. Future admin-only
items — e.g. Users — plug in here with `roles: [ADMIN]` without touching the renderer.)

- **Why:** The admin/organizer menu difference becomes data, not branching code. The filter predicate is a pure function — trivially unit-testable, and the single place future roles plug into.
- **Alternative:** Conditional JSX per role in the sidebar component — rejected: scatters role logic across markup and is harder to test.

### Decision 3: Stateless JWT in localStorage, decoded client-side for UX only

The token is stored under one `localStorage` key; `{ sub, roles }` is decoded (no signature verification) purely to gate UI. The backend re-validates every request.

- **Why:** Matches the existing stateless-JWT backend and keeps the client simple. Client-side role checks are a UX convenience, never a security boundary.
- **Alternative:** Verifying the signature client-side — rejected: requires shipping/managing keys and provides no real security gain since the backend is authoritative. Cookie/session storage — deferred; localStorage matches the mobile app's token approach and is sufficient for this stage.

### Decision 4: Centralized 401 handling in the API client

The shared client attaches `Authorization: Bearer <token>` when a session exists and, on any `401`, clears the session and invokes a registered unauthorized handler that redirects to `/login`.

- **Why:** One choke point for auth expiry instead of per-call handling; keeps features ignorant of session lifecycle.
- **Alternative:** Per-request 401 handling in each feature — rejected: repetitive and error-prone.

### Decision 4b: Role precedence and an access-denied destination

`redirectFor(session)` is a pure function with a fixed precedence — `ADMIN` outranks `ORGANIZER` — so a multi-role user lands deterministically. A signed-in user whose roles include neither `ADMIN` nor `ORGANIZER` (e.g. `CHECKIN_STAFF`, `AUDIENCE`, who belong to other surfaces) is routed to a dedicated **access-denied page** that offers sign-out, and `ProtectedRoute` sends authenticated-but-unpermitted users to that same page.

- **Why:** Without this, a `CHECKIN_STAFF` who authenticates correctly is denied `/dashboard` and bounced to `/login`, but — already authenticated — gets pushed back toward a portal page, risking a redirect loop or a blank screen. An explicit terminal page breaks the loop and tells the user plainly. Centralizing precedence in one pure function makes it unit-testable and the single place future roles plug into.
- **Alternative:** Redirect denied users to `/login` — rejected: causes the loop above. Silently rendering an empty dashboard — rejected: confusing and leaks the shell to users with no business there.

### Decision 5: StatCard is role-agnostic; data scope is the backend's job

A single `<StatCard label value trend />` is used for both roles. This change feeds it mock data, shaped so a later role-scoped API can replace the source without touching the component.

- **Why:** The organizer-vs-admin difference is _which numbers_ the backend returns for the same call, not _which component_ renders them. Keeping the card dumb maximizes reuse.

### Decision 6: Mock data for the dashboard, real auth first

Login integrates the backend now; dashboard numbers are mock.

- **Why:** Auth is the gate everything else depends on and the backend endpoint exists — integrate it first to de-risk the session/redirect flow. Dashboard aggregation endpoints (revenue, sold-out rate) are not built yet; mocking unblocks UI work without waiting on backend, and the StatCard shape (Decision 5) makes the later swap mechanical.

### Decision 7: Stack and conventions mirror `apps/checkin-mobile`

React 18 + Vite 5 + TypeScript + Tailwind CSS v3 (pinned) + React Router v6 + TanStack Query v5. tsconfig extends `tsconfig.base.json` with `jsx: "react-jsx"`, `lib: ["ES2022","DOM","DOM.Iterable"]`, `moduleResolution: "bundler"`. Tests are pure-logic, `environment: 'node'`, `*.spec.ts`, via an app-local `vitest.config.mts`.

- **Why:** Consistency with the existing front-end app; Tailwind v3 because the Stitch export is v3-shaped (v4's CSS-first config is incompatible). React 18 to match `checkin-mobile` (18.3.1).
- **Testing approach:** Extract pure functions (validation, jwt decode, role→redirect, sidebar filter, token storage, client bearer/401) and test them as plain functions — no component rendering — exactly as `checkin-mobile` does.

### Proposed structure

```
apps/web/src/
  app/
    router.tsx           /login (public), /dashboard (protected), /no-access, redirects
    providers.tsx        QueryClientProvider + AuthProvider
    sidebar-config.ts    menu items + roles flags  ◄── admin extension point
  features/
    auth/                LoginPage, AccessDeniedPage, login-validation, api, useLogin
    dashboard/           OrganizerDashboard, StatCard, donut, table, quick-actions, mock data
  shared/
    api/client.ts        bearer + centralized 401
    auth/                token-storage, jwt-decode, AuthContext, useAuth,
                         role-access (canAccess / redirectFor), ProtectedRoute
    ui/                  Input, Button, FieldError, Sidebar primitives
    styles/global.css    theme tokens + glass/gradient helpers
```

## Risks / Trade-offs

- **Mock data diverges from the eventual API shape** → Mitigation: keep mock values behind a typed module and shape StatCard props to the expected API fields (Decision 5), so the swap is localized.
- **Tailwind v4 accidentally installed** → Mitigation: pin `tailwindcss@^3` explicitly and note it in tasks; v4 breaks the Stitch-shaped config.
- **Client role gating mistaken for security** → Mitigation: documented as UX-only; backend re-validates every request and is the sole authority.
- **Two Stitch projects exist (Admin Portal Design / Midnight Venue and an older Organizer Portal / Backstage High-Voltage) could cause drift** → Mitigation: this change commits to the Admin Portal Design "Midnight Venue" token set as the single source; the older Organizer Portal project is disregarded. Admin can later vary tokens by role rather than forking the app.
- **Pure-logic-only tests don't cover rendered layout** → Mitigation: accepted per repo convention; visual fidelity is verified manually against the Stitch screenshot.

## Migration Plan

- Additive only: new `apps/web/` workspace and two root scripts (`dev:web`, `verify:web`). No data migration, no backend change.
- Rollback: remove `apps/web/` and the two scripts; nothing else depends on it.

## Open Questions

- Should the post-login destination for ADMIN differ from `/dashboard` once the admin surface exists? (Deferred to the admin change; `redirectFor(session)` centralizes this — today ADMIN resolves to `/dashboard`.)
- "Forgot?" and "Request Access" links — real flows or remain placeholders? (Out of scope here; placeholders for now. Note the backend already exposes `POST /auth/register`, a future home for "Request Access".)
- Copy is English to match the Stitch design; if the product later localizes to Vietnamese, error/UI strings move behind a single copy module.
