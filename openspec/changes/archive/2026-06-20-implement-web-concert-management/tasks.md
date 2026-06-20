## 1. Backend — management read endpoints and slug updates

- [x] 1.1 Add `findConcertsByOwner(createdById: string): Promise<Concert[]>` to `ConcertWriteRepositoryPort` (`domain/ports/concert-write.port.ts`)
- [x] 1.2 Implement `findConcertsByOwner` in `PrismaConcertWriteRepository`, querying `concert.findMany({ where: { createdById }, orderBy: { updatedAt: 'desc' } })` and mapping to domain `Concert`
- [x] 1.3 Add `findAllConcerts(): Promise<Concert[]>` to `ConcertWriteRepositoryPort` and implement it in `PrismaConcertWriteRepository`, querying all concerts ordered by `updatedAt desc`
- [x] 1.4 Extend slug updates through `UpdateConcertDto`, both organizer/admin update controller handlers (`dto.slug`), `UpdateConcertCommand`, `UpdateConcertUseCase`, and `PrismaConcertWriteRepository.updateConcert`; use the create slug regex and map Prisma `P2002` conflicts to `ConflictException`
- [x] 1.5 Add `ListOrganizerConcertsUseCase` (`application/use-cases/list-organizer-concerts.use-case.ts`) returning `repo.findConcertsByOwner(organizerId)`
- [x] 1.6 Add `GetOrganizerConcertUseCase` (`application/use-cases/get-organizer-concert.use-case.ts`) that calls `AuthorizeConcertManagementUseCase` then `repo.findConcertById`, throwing `ConcertNotFoundError` when missing
- [x] 1.7 Add `ListAdminConcertsUseCase` (`application/use-cases/list-admin-concerts.use-case.ts`) returning `repo.findAllConcerts()`
- [x] 1.8 Add `GetAdminConcertUseCase` (`application/use-cases/get-admin-concert.use-case.ts`) that authorizes with `Role.ADMIN` + `allowAdminOverride: true`, then `repo.findConcertById`, throwing `ConcertNotFoundError` when missing
- [x] 1.9 Add `@Get()` and `@Get(':id')` handlers to `OrganizerConcertController`, passing `req.user.id`, reusing the existing `handleErrors` mapping
- [x] 1.10 Add `@Get('concerts')` and `@Get('concerts/:id')` handlers to `AdminConcertController`, reusing the existing admin guard and `handleErrors` mapping
- [x] 1.11 Wire all read use cases into `ConcertManagementModule` providers and exports
- [x] 1.12 Add use-case specs: organizer list/detail, admin list/detail, and slug update validation/conflict coverage

## 2. Frontend — shared client

- [x] 2.1 Add `patch<T>(path, body)` to `apps/web/src/shared/api/client.ts` mirroring `post` (JSON body, `buildHeaders`, `handleResponse`)
- [x] 2.2 Extend `client.spec.ts` with a case asserting `patch` sends the JSON body and PATCH method

## 3. Frontend — concerts feature: pure logic

- [x] 3.1 Create `features/concerts/types.ts` — `ConcertStatus` union and `Concert` DTO matching backend JSON fields (id, slug, title, artistName, venueName, venueAddress, city, startsAt, endsAt, description, status, timestamps as ISO strings)
- [x] 3.2 Create `features/concerts/status.ts` — `mapStatus(status)` → `{ label, badgeClass }` for PUBLISHED/DRAFT/ENDED/CANCELLED with a neutral default
- [x] 3.3 Create `features/concerts/query-keys.ts` — `concertKeys.list(scope)` and `concertKeys.detail(scope, id)`, where `scope` includes effective role and `session.sub`
- [x] 3.4 Create `features/concerts/concert-form.ts` — `validateConcertForm(values)` (required fields, URL-safe slug regex matching backend DTO, `endsAt` after `startsAt`) plus `toCreatePayload`/`toUpdatePayload` mappers, both including slug
- [x] 3.5 Add specs (node env): `status.spec.ts`, `query-keys.spec.ts`, `concert-form.spec.ts`

## 4. Frontend — concerts feature: data layer

- [x] 4.1 Create `features/concerts/api.ts` — `listConcerts`, `getConcert`, `createConcert`, `updateConcert`, `publishConcert`, `cancelConcert` over the shared client with a role-derived base path (`/organizer/concerts` or `/admin/concerts`)
- [x] 4.2 Add `api.spec.ts` asserting each function calls the right method/path for organizer and admin bases and maps the payload (mock the client functions)
- [x] 4.3 Create `features/concerts/hooks.ts` — `useConcerts`, `useConcert(id)`, and create/update/publish/cancel mutations that derive the base path and query-key scope from auth session (`ADMIN` precedence when present, matching sidebar role resolution) and invalidate scoped `concertKeys` on success

## 5. Frontend — concerts UI (Stitch layout)

- [x] 5.1 `ConcertEmptyState` — centered glass card, animated rings, "No concerts yet", "Create Concert" CTA (matches empty-state design)
- [x] 5.2 `StatusFilterTabs` + `ConcertTable` — page header, status filter tabs (All/Published/Draft/Cancelled/Ended), search box, thumbnail/title/artist/venue/schedule/status/updated columns; client-side filtering via `useMemo`
- [x] 5.3 `ConcertDetailPanel` — overview showing event info (venue, city, schedule) and status, with Edit available to both organizer and admin, plus role-appropriate Publish (DRAFT only) / Cancel actions wired to mutations
- [x] 5.4 `ConcertFormModal` — create/edit form (slug, title, artistName, venueName, venueAddress, city, startsAt, endsAt, description) using `validateConcertForm` and `FieldError`, calling create mutation (organizer-only) or update mutation (organizer and admin); form uses the role-appropriate base path from the update hook
- [x] 5.5 `ConcertsPage` — composes table + empty state; handles loading and error states from `useConcerts`; opens a `ConcertDetailPanel` beside the list for the selected concert
- [x] 5.6 `ConcertDetailPanel` + `ConcertEditPage` — detail panel (event info, status, setup/inventory summary) with Edit, Publish (DRAFT only), and Cancel (when not ENDED/CANCELLED) actions for both organizer and admin; Edit opens a full-page `/concerts/:id/edit` form; no ticket-type or seating-map editor surfaces (deferred)

## 6. Routing and integration

- [x] 6.1 Add the `/concerts` route rendering `ConcertsPage` under the `ShellLayout` children in `app/router.tsx`
- [x] 6.2 Add the `/concerts/:id/edit` edit route rendering `ConcertEditPage` under `ShellLayout`
- [x] 6.3 Remove global `seating-maps` sidebar navigation; organizer sidebar is Concerts + Settings and admin sidebar is Dashboard + Concerts + Staff + Settings
- [x] 6.4 Redirect organizers to `/concerts` on login/root while admins keep `/dashboard`

## 7. Verification

- [x] 7.1 Run `openspec validate implement-web-concert-management --strict`
- [x] 7.2 Run `npm --workspace @ticketbox/web run verify` and `npm --workspace @ticketbox/web run build` (build is needed to typecheck new `.tsx` components)
- [x] 7.3 Run backend Vitest coverage for the new read use cases and slug update behavior (`npm test -- list-organizer-concerts get-organizer-concert list-admin-concerts get-admin-concert concert-write`)
- [x] 7.4 Run `npm run lint` and confirm no mock data is used in `features/concerts` runtime files (test mocks in `*.spec.ts` are allowed)
