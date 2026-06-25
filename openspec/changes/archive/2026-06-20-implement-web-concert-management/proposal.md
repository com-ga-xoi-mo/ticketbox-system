## Why

Organizers and admins can sign in and land on a dashboard, but there is no screen to actually manage concerts in `apps/web/`. The existing public `GET /concerts` endpoint only returns published + upcoming concerts, so it cannot back a management console that must show DRAFT, CANCELLED, and ENDED concerts as well. We need protected backend read paths for organizer/admin roles and the Concert Management UI that consumes them against the real API (no mock data).

## What Changes

- **Backend** — close the read-path gap in `concert-management`:
  - Add `GET /organizer/concerts` → list concerts owned by the authenticated organizer, including DRAFT / PUBLISHED / CANCELLED / ENDED.
  - Add `GET /organizer/concerts/:id` → single concert detail for the organizer.
  - Add `GET /admin/concerts` → list all concerts for admins, including DRAFT / PUBLISHED / CANCELLED / ENDED.
  - Add `GET /admin/concerts/:id` → single concert detail for admins with admin override.
  - Organizer routes reuse `JwtAuthGuard` + `RolesGuard` + `@Roles(ORGANIZER)` and enforce ownership (list filtered by `createdById`; detail verified via the existing ownership authorization use case).
  - Admin routes reuse the existing `AdminConcertController` guard (`@Roles(ADMIN)`) and admin override semantics.
- **Frontend** — new `web-concert-management` feature in `apps/web/`:
  - Master list (table) of the visible management concert set (owned concerts for organizers, all concerts for admins) with status filter tabs, search, and an empty state.
  - `/concerts/:id` detail route showing event info and status for the selected concert.
  - Organizer-only create / edit concert form (slug, title, artistName, venueName, venueAddress, city, startsAt, endsAt, description); slug is editable and validated on update.
  - Admin detail: editable metadata plus publish/cancel moderation actions; no ticket/seating editors. Admins cannot create new concerts.
  - Selecting a concert opens a detail panel beside the list (event info, status, setup/inventory summary) with Edit, Publish (DRAFT only), and Cancel actions; Edit opens a dedicated `/concerts/:id/edit` route. Ticket-type and seating-map editors are deferred to separate changes.
  - Wire list (new GET), organizer create/update, and publish/cancel through TanStack Query using role-appropriate route bases (`/organizer/concerts` for organizers, `/admin/concerts` for admins).
  - Status badge mapping for PUBLISHED / DRAFT / ENDED / CANCELLED.
  - `/concerts` and `/concerts/:id/*` routes inside `ShellLayout`, reachable from the Concerts sidebar item.
  - Organizer sidebar is Concerts + Settings; admin sidebar is Dashboard + Concerts + Staff + Settings. Seating Map is removed from the global sidebar.
  - Add a `patch` helper to the shared API client (currently only `get`/`post`).
- Layout follows the Stitch designs (Master-Detail Concert + Concert Dashboard Empty State) on the existing Midnight Venue theme (glass-panel, primary purple, tertiary cyan).

Out of scope (explicit boundaries): no deep ticket-type editor, no seating-map editor, and dashboard stats stay on mock data.

## Capabilities

### New Capabilities

- `web-concert-management`: The organizer/admin Concert Management surface in `apps/web/` — list with status filtering and empty state, detail routes, organizer create/edit form with editable slug, admin overview-only moderation, and publish/cancel actions, all bound to the real backend via TanStack Query.

### Modified Capabilities

- `concert-management`: Add organizer-scoped read endpoints (`GET /organizer/concerts`, `GET /organizer/concerts/:id`), admin read endpoints (`GET /admin/concerts`, `GET /admin/concerts/:id`), and an editable concert slug on the organizer/admin update path. Organizers list, inspect, create, and edit their own concerts across all statuses; admins list, inspect, and edit any concert and moderate via publish/cancel. Concert creation is organizer-only.
- `web-auth`: Update the post-sign-in redirect so organizers land on `/concerts` (the new management surface) instead of `/dashboard`; admins continue to `/dashboard`.

## Impact

- **Backend code**: `packages/backend/src/concert-management/` — `OrganizerConcertController` and `AdminConcertController` (new GET routes), `concert-write.port` + `PrismaConcertWriteRepository` (`findConcertsByOwner`, `findAllConcerts`, slug update), new read use cases, and module wiring.
- **Frontend code**: `apps/web/src/features/concerts/` (new), `apps/web/src/shared/api/client.ts` (`patch`), `apps/web/src/app/router.tsx` (`/concerts` and `/concerts/:id/*` routes), `apps/web/src/app/sidebar-config.ts` (role-aware sidebar).
- **APIs**: four new authenticated GET endpoints; no breaking changes to existing routes.
- **Tests**: pure-logic Vitest specs (node env, `*.spec.ts`) for form validation, status mapping, query keys, and API client mapping; backend use-case specs for the new read paths and slug update behavior.
