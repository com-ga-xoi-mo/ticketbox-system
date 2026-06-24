## Why

The web concert portal currently shares one `features/concerts` implementation for admin and organizer flows, with role checks such as `role === 'ADMIN'` spread through pages and hooks. Splitting the role-specific page and data paths will make each role's workflow easier to read and extend while keeping heavy shared UI and form logic in one place.

## What Changes

- Move role-neutral concert code into `apps/web/src/features/concerts-shared/`, including types, status helpers, query key helpers, form helpers, and presentational/shared concert components that do not import role-specific hooks.
- Refactor shared concert components that currently call mutation hooks so role features inject handlers and pending state through props; keep organizer-only create modal behavior in the organizer concert feature unless it is made fully presentational.
- Create `apps/web/src/features/admin/concerts/` with admin-only concert pages, hooks, and API wiring using the fixed `/admin/concerts` base path.
- Create `apps/web/src/features/organizer/concerts/` with organizer-only concert pages, hooks, and API wiring using the fixed `/organizer/concerts` base path.
- Move the existing admin dashboard feature under `apps/web/src/features/admin/dashboard/`.
- Change protected web routes from shared `/dashboard` and `/concerts` paths to role-prefixed paths:
  - `/admin/dashboard`, `/admin/concerts`, `/admin/concerts/:id/edit`
  - `/organizer/concerts`, `/organizer/concerts/:id/edit`
- Update role redirects, sidebar links, and internal navigation to use the role-prefixed routes.
- Keep shared shell, auth, API client, UI primitives, and hook-free concert detail presentation single-sourced; no backend endpoint or business behavior changes are included.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `web-concert-management`: Concert management routes become role-prefixed, and query cache keys become feature-folder specific instead of carrying a shared role scope.
- `web-app-shell`: Role redirects and sidebar navigation point to role-prefixed admin and organizer routes while keeping a single shared shell.

## Impact

- Affected code is limited to `apps/web/src` frontend routing, feature folders, concert hooks/API imports, sidebar configuration, role redirects, and related tests/spec files.
- Backend APIs, auth contracts, shared UI components, and business lifecycle behavior remain unchanged.
- Verification target is `npm --workspace @ticketbox/web run verify`, plus manual admin and organizer smoke checks against the new paths.
