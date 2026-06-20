## 1. Domain Commands and Write Models

- [x] 1.1 Define `CreateConcertCommand` domain command with fields: `createdById`, `slug`, `title`, `artistName`, `venueName`, `venueAddress?`, `city`, `startsAt`, `endsAt`, `description?`. Slug is required and user-supplied.
- [x] 1.2 Define `UpdateConcertCommand` domain command with `concertId`, `requesterId`, `requesterRole`, and all updatable concert fields as optional.
- [x] 1.3 Define `PublishConcertCommand` and `CancelConcertCommand` domain commands with `concertId`, `requesterId`, `requesterRole`.
- [x] 1.4 Define `CreateTicketTypeCommand` with `concertId`, `requesterId`, `requesterRole`, `code`, `name`, `description`, `priceVnd`, `totalQuantity`, `saleStartsAt`, `saleEndsAt`, `maxPerUser`, `status`.
- [x] 1.5 Define `UpdateTicketTypeCommand` and `ArchiveTicketTypeCommand` with `concertId`, `ticketTypeId`, `requesterId`, `requesterRole`, and updatable fields as optional.

## 2. Concert Write Use Cases

- [x] 2.1 Implement `CreateConcertUseCase`: validate required fields, validate `slug` matches URL-safe pattern (lowercase alphanumeric and hyphens), persist via write adapter (Prisma unique constraint on slug rejects duplicates), return created concert summary.
- [x] 2.2 Implement `UpdateConcertUseCase`: load concert, call `AuthorizeConcertManagementUseCase.execute({ actor, concertId, allowAdminOverride })` for ownership enforcement, reject if concert status is ENDED or CANCELLED, apply updates, persist.
- [x] 2.3 Implement `PublishConcertUseCase`: load concert, call `AuthorizeConcertManagementUseCase` for ownership, assert current status is DRAFT (reject PUBLISHED/CANCELLED/ENDED), set `status = PUBLISHED` and `publishedAt = now()`, persist.
- [x] 2.4 Implement `CancelConcertUseCase`: load concert, call `AuthorizeConcertManagementUseCase` for ownership, assert current status is DRAFT or PUBLISHED (reject CANCELLED/ENDED), set `status = CANCELLED` and `cancelledAt = now()`, persist.
- [x] 2.5 Add status transition guard helper: throw `BadRequestException` with message if transition is not allowed (e.g., publish already-published, cancel already-cancelled).

## 3. Ticket Type Write Use Cases

- [x] 3.1 Implement `CreateTicketTypeUseCase`: call `AuthorizeConcertManagementUseCase` for ownership (organizer routes: `allowAdminOverride: false`; admin routes: `allowAdminOverride: true`), validate `priceVnd >= 0`, `totalQuantity >= 1`, `saleEndsAt > saleStartsAt`, check for duplicate `code` (case-insensitive) within the same concert, persist.
- [x] 3.2 Implement `UpdateTicketTypeUseCase`: call `AuthorizeConcertManagementUseCase` for ownership, apply partial updates, re-validate constraints on changed fields, check duplicate code if code is being changed, persist.
- [x] 3.3 Implement `ArchiveTicketTypeUseCase`: call `AuthorizeConcertManagementUseCase` for ownership, assert no sold or reserved tickets exist for the type (`soldQuantity + reservedQuantity === 0`), set `status = ARCHIVED` (soft delete — do not hard-delete the record to preserve order history).

## 4. Prisma Write Adapter

- [x] 4.1 Add `ConcertWriteRepository` interface/port inside `packages/backend/src/concert-management/domain/ports/`.
- [x] 4.2 Implement `PrismaConcertWriteRepository` inside `packages/backend/src/concert-management/infrastructure/database/` with methods: `createConcert`, `updateConcert`, `findConcertById` (for status check and update — ownership is handled by `AuthorizeConcertManagementUseCase`), `createTicketType`, `updateTicketType`, `archiveTicketType` (sets `status = ARCHIVED`), `findTicketTypesByConcertId` (for duplicate check).
- [x] 4.3 Ensure write adapter maps Prisma models to domain types before returning; do not leak Prisma types into use cases.

## 5. HTTP Controllers (Organizer + Admin)

- [x] 5.0a Add `AuthModule` to `ConcertManagementModule`'s `imports` array in `concert-management.module.ts` so that `JwtAuthGuard`, `RolesGuard`, and `AuthorizeConcertManagementUseCase` are available for dependency injection within the module.
- [x] 5.0b Add `export * from './identity/auth.module';` to `packages/backend/src/index.ts` so that `JwtAuthGuard`, `RolesGuard`, `Roles`, `Role`, and `AuthorizeConcertManagementUseCase` are importable from `@ticketbox/backend`.
- [x] 5.1 Add `OrganizerConcertController` with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.ORGANIZER)` — import `JwtAuthGuard`, `RolesGuard`, `Roles`, `Role` from `@ticketbox/backend`. Routes: `POST /organizer/concerts`, `PATCH /organizer/concerts/:id`, `POST /organizer/concerts/:id/publish`, `POST /organizer/concerts/:id/cancel`.
- [x] 5.2 Add `OrganizerTicketTypeController` with organizer guard. Routes: `POST /organizer/concerts/:id/ticket-types`, `PATCH /organizer/concerts/:id/ticket-types/:typeId`, `PATCH /organizer/concerts/:id/ticket-types/:typeId/archive`.
- [x] 5.3 Add `AdminConcertController` with `@Roles(Role.ADMIN)` guard — import guards from `@ticketbox/backend`. Routes: `POST /admin/concerts`, `PATCH /admin/concerts/:id`, `POST /admin/concerts/:id/publish`, `POST /admin/concerts/:id/cancel`, `POST /admin/concerts/:id/ticket-types`, `PATCH /admin/concerts/:id/ticket-types/:typeId`, `PATCH /admin/concerts/:id/ticket-types/:typeId/archive`.
- [x] 5.4 Extract `requesterId` and `requesterRole` from `req.user` (set by JWT guard) and pass them into commands.
- [x] 5.5 Ensure all controllers delegate to use cases and contain no business logic.

## 6. DTOs and Validation Pipes

- [x] 6.1 Create `CreateConcertDto` with `class-validator` decorators: `@IsString()`, `@IsDateString()`, `@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug` (URL-safe pattern), required field assertions.
- [x] 6.2 Create `UpdateConcertDto` with all fields optional using `@IsOptional()`.
- [x] 6.3 Create `CreateTicketTypeDto`: `@IsString() code`, `@IsString() name`, `@Min(0) priceVnd`, `@Min(1) totalQuantity`, `@IsDateString() saleStartsAt`, `@IsDateString() saleEndsAt`, `@Min(1) maxPerUser`.
- [x] 6.4 Create `UpdateTicketTypeDto` with all fields optional.
- [x] 6.5 Register `ValidationPipe` globally or per-controller if not already global.

## 7. Authorization Tests

- [x] 7.1 Unit test `UpdateConcertUseCase`: organizer requesting their own concert succeeds; organizer requesting another organizer's concert throws `ForbiddenConcertOwnershipError`.
- [x] 7.2 Unit test `UpdateConcertUseCase` with admin caller: admin requesting any concert succeeds regardless of `createdById`.
- [x] 7.3 Unit test `PublishConcertUseCase`: DRAFT → PUBLISHED succeeds; PUBLISHED → PUBLISHED throws; CANCELLED → PUBLISHED throws; ENDED → PUBLISHED throws.
- [x] 7.4 Unit test `CancelConcertUseCase`: DRAFT → CANCELLED succeeds; PUBLISHED → CANCELLED succeeds; CANCELLED → CANCELLED throws; ENDED → CANCELLED throws.
- [x] 7.5 API/integration test: unauthenticated `POST /organizer/concerts` returns 401; organizer token returns 201.

## 8. Validation Tests

- [x] 8.1 Unit test `CreateTicketTypeUseCase`: negative `priceVnd` throws validation error; zero `totalQuantity` throws; `saleEndsAt <= saleStartsAt` throws.
- [x] 8.2 Unit test `CreateTicketTypeUseCase`: duplicate ticket type code within same concert throws `ConflictException`; same code in a different concert succeeds.
- [x] 8.3 Unit test `UpdateTicketTypeUseCase`: updating code to an existing code in same concert throws `ConflictException`.
- [x] 8.4 Unit test `ArchiveTicketTypeUseCase`: archiving a type with `soldQuantity > 0` throws `BadRequestException`; archiving a type with zero sold/reserved sets `status = ARCHIVED`.
- [x] 8.5 API/integration test: `POST /organizer/concerts/:id/ticket-types` with invalid price returns 400 with field error; with duplicate code returns 409.

## 9. Admin Verification Surface (.http file)

- [x] 9.1 Create `docs/admin-api-demo/concert-admin-management.http` (VS Code REST Client format) with variables `@baseUrl = http://localhost:3000`, `@organizerToken`, `@adminToken`, `@otherOrganizerToken`.
- [x] 9.2 Add request: organizer creates concert → captures `concertId`.
- [x] 9.3 Add request: organizer creates ticket type → captures `ticketTypeId`.
- [x] 9.4 Add request: organizer attempts to create duplicate ticket type code → expects 409.
- [x] 9.5 Add request: organizer attempts to create ticket type with negative price → expects 400.
- [x] 9.6 Add request: organizer publishes concert → expects PUBLISHED status.
- [x] 9.7 Add request: organizer attempts to publish already-published concert → expects 400.
- [x] 9.8 Add request: organizer cancels concert → expects CANCELLED status.
- [x] 9.9 Add request: different organizer token attempts to update the concert → expects 403.
- [x] 9.10 Add request: admin token updates the concert → expects 200 regardless of owner.

## 10. Documentation and Demo Evidence

- [x] 10.1 Update `README.md` or project docs with organizer and admin API route reference and example tokens (from seed data).
- [x] 10.2 Document how to obtain an organizer JWT and admin JWT using seed credentials.
- [x] 10.3 Add demo evidence steps: start stack, open `docs/admin-api-demo/concert-admin-management.http` in VS Code REST Client, run each request, verify expected status codes and response shapes.
- [x] 10.4 Note explicitly that seating map upload and Redis cache invalidation on write are deferred to later changes.
- [x] 10.5 Run `npm run lint`, `npm run test`, relevant API validation commands; record any remaining failures with reasons.
