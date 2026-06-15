## Context

The `implement-concert-catalog` change (archived) created the Concert Management module with public read endpoints inside `packages/backend/src/concert-management`. Auth, RBAC, and admin access control are implemented by Member 1's archived changes (`implement-auth-rbac`, `implement-admin-access-control`). JWT guards, role guards (`@Roles(Role.ORGANIZER)`, `@Roles(Role.ADMIN)`), and the ownership pattern are available.

Current state:
- `packages/backend/src/concert-management` exists with domain read models, catalog use cases, Prisma catalog query adapter, and public HTTP controllers.
- Prisma schema contains `Concert`, `TicketType`, `Asset`, `SeatingZone`, `TicketTypeZone` models with all required fields: `createdById`, `status`, `totalQuantity`, `reservedQuantity`, `soldQuantity`, `saleStartsAt`, `saleEndsAt`, `maxPerUser`, `priceVnd`, etc.
- No organizer/admin write endpoints exist yet.
- `JwtAuthGuard`, `RolesGuard`, `Roles`, and `Role` are exported from `@ticketbox/backend` (source: `packages/backend/src/identity/auth.module.ts`).

## Goals / Non-Goals

**Goals:**
- Implement organizer protected APIs: create concert, update concert, publish concert, cancel concert.
- Implement ticket type write APIs: create, update, and archive ticket types within an owned concert (archive sets `status = ARCHIVED`; hard delete is not permitted).
- Enforce ownership at the domain/use-case level: organizer may only touch their own concerts; admin may touch any concert through an admin-prefixed route.
- Add DTO validation via `class-validator` for concert and ticket type write payloads.
- Validate: negative price, zero/negative quantity, invalid sale window (`saleEndsAt` must be after `saleStartsAt`), duplicate ticket type code within the same concert.
- Provide a `.http` request file (VS Code REST Client) as the minimal admin verification surface for demonstrating admin override behavior.
- Add authorization tests, validation tests, state-transition tests, and duplicate-code rejection tests.

**Non-Goals:**
- SVG seating map upload, sanitization, and object storage — belongs to `implement-seating-map-assets`.
- Redis cache invalidation on write — belongs to `implement-concert-caching`.
- Full admin web UI beyond a minimal `.http` verification surface.
- Order lifecycle, checkout, payment, QR ticket issuance.
- Seating zone definition and ticket-to-zone mapping writes — can be included as stretch if time permits, but must not block this change's core deliverable.

## Decisions

### Decision 1: Extend the existing Concert Management module with write use cases and adapters

Add organizer write use cases (`CreateConcertUseCase`, `UpdateConcertUseCase`, `PublishConcertUseCase`, `CancelConcertUseCase`) and ticket type write use cases (`CreateTicketTypeUseCase`, `UpdateTicketTypeUseCase`, `ArchiveTicketTypeUseCase`) inside `packages/backend/src/concert-management/application/use-cases/`.

Add corresponding Prisma write adapters inside `packages/backend/src/concert-management/infrastructure/database/`.

Add organizer HTTP controllers inside `packages/backend/src/concert-management/adapters/http/` with routes:
```text
POST   /organizer/concerts
PATCH  /organizer/concerts/:id
POST   /organizer/concerts/:id/publish
POST   /organizer/concerts/:id/cancel
POST   /organizer/concerts/:id/ticket-types
PATCH  /organizer/concerts/:id/ticket-types/:typeId
PATCH  /organizer/concerts/:id/ticket-types/:typeId/archive

# Admin routes (no ownership check, admin role required; same use cases as organizer)
POST   /admin/concerts
PATCH  /admin/concerts/:id
POST   /admin/concerts/:id/publish
POST   /admin/concerts/:id/cancel
POST   /admin/concerts/:id/ticket-types
PATCH  /admin/concerts/:id/ticket-types/:typeId
PATCH  /admin/concerts/:id/ticket-types/:typeId/archive
```

Rationale:
- Keeps all concert lifecycle logic inside one bounded-context module per the blueprint.
- Separate organizer and admin route prefixes make ownership enforcement predictable: organizer routes use an ownership guard; admin routes use only a role guard.
- Reuses the existing module registration without creating a second module.

Alternative considered:
- A standalone Admin module. Rejected because it would duplicate Concert domain logic and cross module boundaries.

### Decision 2: Reuse AuthorizeConcertManagementUseCase for ownership enforcement

Reuse the existing `AuthorizeConcertManagementUseCase` from `@ticketbox/backend` (identity module). This use case accepts a `ConcertAuthorizationCommand` with `{ actor: { userId, roles }, concertId, allowAdminOverride? }`. It checks `concert.createdById` via `ConcertOwnershipRepositoryPort`, throws `ForbiddenConcertOwnershipError` if the organizer is not the owner, and short-circuits for admin callers when `allowAdminOverride: true`. Organizer routes pass `allowAdminOverride: false`; admin routes pass `allowAdminOverride: true`.

Rationale:
- Guards operate on route metadata and cannot easily perform a database ownership check without injecting a repository, which couples the guard to the domain.
- Use-case-level checks keep the domain rule inside the bounded context and remain testable without HTTP context.

Alternative considered:
- Custom ownership guard with repository injection. Acceptable, but duplicates ownership logic across multiple guards.

### Decision 3: Validate ticket type constraints at the use-case level with database uniqueness check

`CreateTicketTypeUseCase` and `UpdateTicketTypeUseCase` query existing ticket types for the same concert before persisting to detect duplicate code. Validation rules:
- `priceVnd >= 0` (free events allowed; negative price rejected).
- `totalQuantity >= 1`.
- `saleEndsAt > saleStartsAt` (sale window order only; `saleStartsAt` may be in the past to support seed data and admin corrections).
- Ticket type code is unique within the concert (case-insensitive comparison).

Rationale:
- Database-level unique constraint on `(concertId, code)` provides a final safety net but returns a raw DB error. Use-case-level validation returns a domain-specific `ConflictException` with a clear message.
- All other validation (price, quantity, dates) fits naturally in use-case command validation or DTO class-validator decorators.

Alternative considered:
- Rely purely on a Prisma unique constraint. Rejected because it leaks DB-specific errors to the HTTP layer.

### Decision 4: Use a `.http` request file as the minimal admin verification surface

Provide `docs/admin-api-demo/concert-admin-management.http` (REST Client format) with variables `@baseUrl`, `@organizerToken`, `@adminToken`, `@otherOrganizerToken` covering organizer create/publish/cancel, ticket type CRUD, ownership rejection, and admin override success.

Rationale:
- A full admin web UI is out of scope for this change per the proposal.
- A `.http` file is version-control-friendly, requires no external tool, and is readable in VS Code with the REST Client extension.
- It is a lightweight deliverable that satisfies `blueprint/specs/submission-readiness.md` demo evidence requirements.

Alternative considered:
- Postman collection. Rejected because `.http` files commit cleanly without external Postman environment files and are already the team's preferred demo format.

### Decision 5: Concert status transitions are enforced in use cases

Allowed transitions:
```text
DRAFT → PUBLISHED  (via publish)
DRAFT → CANCELLED  (via cancel)
PUBLISHED → CANCELLED  (via cancel)
```
Blocked states: ENDED and CANCELLED concerts cannot be published, updated, or cancelled. Attempting a disallowed transition returns a `BadRequestException` with a clear status transition error message.

Use cases must also set timestamps: `PublishConcertUseCase` sets `publishedAt = now()`; `CancelConcertUseCase` sets `cancelledAt = now()`.

Rationale:
- The target spec requires that cancelled concerts prevent new ticket purchases. Enforcing the transition in the use case makes the rule testable without HTTP.
- The Prisma schema includes `publishedAt` and `cancelledAt` nullable timestamp columns that must be populated for audit and display purposes.

### Decision 6: Organizer supplies slug on concert creation

`CreateConcertUseCase` requires the organizer to supply `slug` as a required field. The use case validates that the slug matches a URL-safe pattern (lowercase alphanumeric and hyphens, no leading/trailing hyphens) and rejects duplicates via Prisma's unique constraint. `venueAddress` is accepted as an optional field in `CreateConcertCommand`.

Rationale:
- The Prisma schema has a unique `slug` column (varchar 180) used by public catalog endpoints (`GET /concerts/:slug`). Letting the organizer choose the slug gives them control over their concert's URL.
- Validation ensures the slug is URL-safe before persisting.

Alternative considered:
- Auto-generate slug from title. Acceptable but removes organizer control over the public URL path.

## Risks / Trade-offs

- [Risk] Organizer can update a concert that already has sold tickets, potentially making ticket type data inconsistent. → Mitigation: Allow updates but disallow decreasing `totalQuantity` below `soldQuantity + reservedQuantity`; add a validation check in the update use case.
- [Risk] Admin route and organizer route may diverge in behavior silently. → Mitigation: Both call the same core use case; the only difference is whether the ownership check is skipped for admin callers.
- [Risk] `.http` demo file may become stale as API evolves. → Mitigation: Keep it under version control and update it as part of this change's tasks.
- [Risk] Seating zone write operations may be requested as part of this change scope but are out of scope. → Mitigation: The proposal explicitly excludes seating map authoring; defer to `implement-seating-map-assets`.
