## Context

The backend `concert-management` module (NestJS, hexagonal: ports + use cases + Prisma adapters) already exposes organizer write endpoints (`POST /organizer/concerts`, `PATCH /organizer/concerts/:id`, `POST .../publish`, `POST .../cancel`), admin write endpoints under `/admin/concerts`, and a public read catalog (`GET /concerts`). The public catalog only returns published + available concerts, so an organizer/admin console cannot use it to show DRAFT/CANCELLED/ENDED concerts. There is no protected management read endpoint.

On the frontend, `apps/web/` (React + Vite + React Router + TanStack Query + Tailwind) has a working auth shell: `ProtectedRoute`, `ShellLayout`, `Sidebar` (already contains a `/concerts` item), and an `OrganizerDashboard` built on mock data. The shared API client (`shared/api/client.ts`) exposes only `get` and `post`. The Midnight Venue theme tokens (`glass-panel`, `glass-card`, `primary`, `tertiary`, `surface-*`, mono labels) are defined in `tailwind.config.ts` and used by the dashboard.

Stitch reference designs were downloaded and read before design: the Master-Detail Concert dashboard (sidebar + page header + status filter tabs + filter toolbar + data table + right detail panel + pagination) and the Concert Dashboard empty state (centered glass card with animated rings + "No concerts yet" + dual CTAs). These define the target layout.

## Goals / Non-Goals

**Goals:**

- Add organizer-scoped read endpoints that return owned concerts in all statuses, ownership-enforced.
- Add admin read endpoints that return all concerts in all statuses with admin override semantics.
- Allow slug edits through the existing update endpoints with the same slug validation as create.
- Build the Concert Management UI bound to the real API via TanStack Query — list, detail routes, organizer create/edit, and publish/cancel moderation — with empty/loading/error states.
- Allow admins to inspect and edit concert metadata (same form as organizer) and publish/cancel; admins cannot create concerts and cannot access ticket/seating editor tabs from the web UI.
- Move Seating Map out of the global sidebar; ticket-type and seating-map setup are organizer-only tabs under `/concerts/:id`.
- Keep pure logic (validation, status mapping, query keys, api mapping) in small testable modules with node-env `*.spec.ts` tests.
- Match the Stitch layout on the existing theme.

**Non-Goals:**

- Deep ticket-type editor and seating-map editor (separate changes).
- Real dashboard stats (stays mock).
- Pagination/search/filter pushed to the backend — filtering is client-side over the returned list this change.
- jsdom/component-render tests.

## Decisions

### Backend: new read use cases over the existing write port

Add `findConcertsByOwner(createdById)` and `findAllConcerts()` to `ConcertWriteRepositoryPort` + `PrismaConcertWriteRepository` (the port already owns `findConcertById`). Add thin read use cases:

- `ListOrganizerConcertsUseCase` — returns `repo.findConcertsByOwner(organizerId)`; no per-row authorization needed because the query is already filtered by owner.
- `GetOrganizerConcertUseCase` — calls `AuthorizeConcertManagementUseCase` (same pattern as update/cancel) then `repo.findConcertById(id)`, throwing `ConcertNotFoundError` when missing.
- `ListAdminConcertsUseCase` — returns `repo.findAllConcerts()`.
- `GetAdminConcertUseCase` — calls `AuthorizeConcertManagementUseCase` with `Role.ADMIN` + `allowAdminOverride: true`, then `repo.findConcertById(id)`, throwing `ConcertNotFoundError` when missing.

Wire organizer reads into `OrganizerConcertController` as `@Get()` and `@Get(':id')`, reusing the controller's existing `handleErrors` mapping (`ForbiddenConcertOwnershipError` → 403, `ConcertNotFoundError` → 404). Controller-level guards (`JwtAuthGuard`, `RolesGuard`, `@Roles(ORGANIZER)`) already apply to the whole class. Wire admin reads into `AdminConcertController` as `@Get('concerts')` and `@Get('concerts/:id')`; the controller already uses `@Roles(ADMIN)`.

_Alternative considered:_ a separate read port/repository. Rejected — it duplicates Prisma wiring for two trivial reads; the write repo already maps the `Concert` domain shape.

_Alternative considered:_ extend the public catalog endpoint with an `owner`/`includeAll` flag. Rejected — mixes public and privileged read semantics on one route and complicates guarding.

### Backend: slug updates and ordering

Extend `UpdateConcertDto`, `UpdateConcertCommand`, `UpdateConcertUseCase`, and `PrismaConcertWriteRepository.updateConcert` to accept `slug`. Use the same URL-safe regex as create and map Prisma unique conflicts (`P2002`) to `ConflictException`, matching create behavior.

`findConcertsByOwner` and `findAllConcerts` order by `updatedAt desc` so the list mirrors the design's "Updated" column and shows recently touched concerts first.

### Frontend: feature module layout

New `apps/web/src/features/concerts/`:

- `types.ts` — `ConcertStatus` union + `Concert` DTO mirroring the backend domain fields used by the UI.
- `status.ts` — `mapStatus(status)` → `{ label, badgeClass }` with a safe default; pure, tested.
- `concert-form.ts` — `validateConcertForm(values)` → field errors (required fields, URL-safe slug regex matching the backend DTO, `endsAt` after `startsAt`); pure, tested. Also `toCreatePayload`/`toUpdatePayload` mappers, both including slug.
- `query-keys.ts` — `concertKeys.list(scope)` and `concertKeys.detail(scope, id)`; pure, tested. `scope` includes the effective role and `session.sub` so admin/organizer sessions cannot share list/detail cache accidentally.
- `api.ts` — `listConcerts(basePath)`, `getConcert(basePath, id)`, `createConcert(basePath, payload)`, `updateConcert(basePath, id, payload)`, `publishConcert(basePath, id)`, `cancelConcert(basePath, id)` over the shared client; mapping tested. `basePath` is `/organizer/concerts` or `/admin/concerts`.
- `hooks.ts` — `useConcerts`, `useConcert`, and mutation hooks that derive the route base and query-key scope from the authenticated session (`ADMIN` takes precedence when present, matching the sidebar role resolution) and invalidate the scoped `concertKeys` on success.
- Components: `ConcertsPage` (route), `ConcertTable`, `StatusFilterTabs`, `ConcertDetailPanel`, `ConcertEmptyState`, `ConcertFormModal`.
- `ConcertDetailPage` owns `/concerts/:id/*`: admins see only the Overview tab with edit + publish/cancel actions; organizers see Overview, Ticket Types, and Seating Map tabs. Ticket Types and Seating Map are route placeholders for separate editor changes, not global navigation items.

### Frontend: add `patch` to the shared client

The client only has `get`/`post`. Add a `patch<T>(path, body)` mirroring `post` (JSON body, `buildHeaders`, `handleResponse`) so edit can call the role-appropriate `PATCH .../concerts/:id` endpoint. Keep publish/cancel on `post` (they are POST endpoints).

### Frontend: client-side filtering and route selection

The status filter tabs and search filter the already-fetched list in component state (`useMemo`), matching the design without new backend params. Include `Ended` as a filter tab because management reads return ENDED concerts. Selecting a concert navigates to `/concerts/:id`; the detail query uses the session-scoped detail cache key.

### Theme alignment

Reuse existing `glass-panel`/`glass-card` and theme tokens rather than re-declaring the Stitch inline CSS. The Stitch HTML uses a `btn-primary` gradient and `glass-card`; map these to existing global styles/utilities so Concert Management matches the dashboard exactly.

## Risks / Trade-offs

- **Client-side filtering won't scale to large concert counts** → acceptable now (organizer-owned lists are small); backend pagination/filtering is a later change and the query-key design already leaves room for parameterized keys.
- **`GET /organizer/concerts/:id` runs an ownership lookup then a fetch (two queries)** → negligible at this scale and it reuses the audited authorization path rather than inventing a new one.
- **Status union drift** (backend could introduce a new status) → `mapStatus` falls back to a neutral badge instead of throwing, and the unknown-status scenario is tested.
- **No jsdom tests means component wiring is unverified by unit tests** → mitigated by keeping all branching logic in pure modules that are tested; components stay thin.

## Migration Plan

Additive only — no schema changes, no breaking API changes. Ship backend read endpoints and frontend feature together. Rollback is removing the new routes/feature; existing endpoints and the dashboard are untouched.

## Open Questions

- Should the detail panel show inventory/setup progress (as in the Stitch mock) now, or only event info + status? Default: event info + status + lifecycle actions this change; inventory/setup blocks come with the ticket-type/seating editors.
