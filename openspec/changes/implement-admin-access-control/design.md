## Context

TicketBox is a NestJS modular monolith with strict hexagonal module boundaries. The current backend has platform infrastructure, Prisma, seed data, JWT authentication, a `Role` enum, `JwtAuthGuard`, `RolesGuard`, and identity use cases. The accepted blueprint and team plan assign this change to Member 1 and require admin route protection, organizer ownership checks, check-in staff assignment authorization, and permission tests.

The database schema already contains the access-control data needed for this scope: users and roles, `Concert.createdById` for organizer ownership, `CheckinStaffAssignment` for staff-to-concert/gate assignment, and check-in event result values including `UNASSIGNED_STAFF`. The implementation should therefore add authorization behavior and adapters without broad schema churn.

## Goals / Non-Goals

**Goals:**

- Keep identity access control aligned with the blueprint's Clean/Hexagonal Architecture rule: domain and application code must not import Prisma, Nest HTTP types, controllers, guards, Redis clients, or provider SDKs.
- Provide reusable application use cases for admin authorization, organizer concert access, and check-in staff assignment decisions.
- Expose narrow ports that future concert and check-in modules can depend on for authorization without coupling to Prisma.
- Enforce admin-only and role-protected routes with the existing JWT-first, role-second guard sequence.
- Add focused unit and integration-style tests for allowed and denied paths, including 401 vs 403 behavior.

**Non-Goals:**

- Implement full concert management endpoints or check-in scan/sync workflows.
- Redesign JWT authentication, password handling, or user registration.
- Add a new policy engine, CASL, Oso, or external authorization service.
- Implement admin user-management screens or frontend permission UX.

## Decisions

### Decision 1: Implement authorization decisions as identity application use cases

Add use cases such as `AuthorizeAdminActionUseCase`, `AuthorizeConcertManagementUseCase`, `AuthorizeCheckinAssignmentUseCase`, and assignment management use cases under `packages/backend/src/identity/application/use-cases`. Each use case accepts primitive command/query objects containing the authenticated user ID, roles, concert ID, and optional gate context.

Rationale:

- Authorization rules become testable without HTTP or database setup.
- Future controllers can call one use case instead of duplicating role and ownership checks.
- The implementation stays consistent with the existing identity module, where application use cases depend only on domain ports.

Alternatives considered:

- Put all logic in Nest guards: simple for roles, but ownership and assignment checks require persistence and would push business rules into HTTP adapters.
- Put checks inside future concert/check-in services only: would duplicate rules across modules and make this change untestable until those modules exist.

### Decision 2: Define persistence behind access-control ports

Add domain/application ports for reading concert ownership and check-in staff assignment state. Prisma adapters under `packages/backend/src/identity/infrastructure/database` implement those ports by querying `concerts` and `checkin_staff_assignments`.

Rationale:

- The blueprint requires inner layers to avoid ORM imports.
- Existing schema already has the necessary data model, so a port/adapter layer is enough.
- Ports can later be moved to a shared application contract if module extraction becomes necessary.

Alternatives considered:

- Import `PrismaService` directly in use cases: faster, but violates the project architecture.
- Create a new shared database utility module for authorization: risks becoming an anemic cross-module shortcut around bounded contexts.

### Decision 3: Treat `ADMIN` as explicit override, not implicit role inheritance

Admin users pass admin-only routes and may override organizer ownership checks where a route intentionally allows platform administration. `ADMIN` does not automatically satisfy every `ORGANIZER` or `CHECKIN_STAFF` route unless the route/use case declares that override.

Rationale:

- This avoids accidental privilege expansion in check-in workflows.
- It keeps route intent visible through `@Roles()` and use-case command names.

Alternatives considered:

- Make `ADMIN` pass every role check: convenient but too broad for gate-scanning and audit-sensitive workflows.

### Decision 4: Keep route guards coarse and use cases resource-aware

Controllers should continue using `JwtAuthGuard` and `RolesGuard` for authentication and coarse role checks. Resource checks such as "owns this concert" or "is assigned to this concert/gate" happen in application use cases after the JWT identity is available.

Rationale:

- Guards remain reusable and simple.
- Resource-aware decisions can return precise domain errors that HTTP adapters map to `403 Forbidden` or check-in rejection results.

Alternatives considered:

- Add a generic `PoliciesGuard`: likely premature for this project and harder to keep within the existing module style.

### Decision 5: Manage check-in assignments as admin/organizer-controlled records

Add use cases and an internal HTTP adapter for assigning, revoking, and listing check-in staff assignments. A staff assignment is active only when the user has `CHECKIN_STAFF`, the assignment status is `ACTIVE`, and the concert/gate criteria match.

Organizers may assign and revoke check-in staff for concerts they own. Admin users may assign and revoke check-in staff for any concert. This keeps event operations practical while preserving ownership checks.

Rationale:

- The database already models assignment status, gate name, assigned/revoked timestamps, and uniqueness.
- It gives later check-in APIs a deterministic authorization source.
- It matches the requirements: organizers manage their concerts, while check-in staff only access scan workflows for assigned concerts/gates.

Alternatives considered:

- Authorize all `CHECKIN_STAFF` globally: contradicts the blueprint and allows staff assigned to one event to scan another event.
- Make staff assignment admin-only: simpler, but it blocks organizers from preparing gate operations for their own concerts.

### Decision 6: Use a route permission matrix to avoid confusing admin web with admin-only actions

The admin web is an internal surface used by both organizers and admins. Route authorization must distinguish organizer-admin workflows from platform-admin workflows:

```text
Route family                         Coarse role check              Resource check
-----------------------------------  -----------------------------  ------------------------------
/admin/concerts                      ORGANIZER or ADMIN             creator on create result
/admin/concerts/{id}                 ORGANIZER or ADMIN             owner or admin override
/admin/concerts/{id}/ticket-types    ORGANIZER or ADMIN             owner or admin override
/admin/concerts/{id}/staff           ORGANIZER or ADMIN             owner or admin override
/admin/users                         ADMIN                          none beyond admin
/admin/system                        ADMIN                          none beyond admin
/checkin/scan                        CHECKIN_STAFF                  active concert/gate assignment
/checkin/sync                        CHECKIN_STAFF                  active assignment per event
/guest-list/vip-lookup               CHECKIN_STAFF                  active VIP gate/concert assignment
```

Rationale:

- `docs/requirements.md` says the admin web is for organizers, while the blueprint reserves `ADMIN` for platform-wide operations.
- The matrix keeps `ADMIN` route protection from accidentally excluding organizers from concert management.
- VIP gate lookup can reuse the same check-in assignment authorization when guest-list implementation arrives.

Alternatives considered:

- Treat every `/admin/*` endpoint as `ADMIN` only: contradicts organizer requirements.
- Put every internal endpoint behind `ORGANIZER` or `ADMIN`: too broad for platform user/system management.

## Risks / Trade-offs

- [Risk] Future concert/check-in modules may introduce their own authorization helpers. -> Mitigation: export explicit identity authorization ports/use cases from `AuthModule` and document the expected consumption pattern in tasks.
- [Risk] Admin override behavior can be misapplied. -> Mitigation: make override an explicit command flag or dedicated use case path and cover both allowed and denied tests.
- [Risk] Gate-level assignment semantics may evolve with the mobile app. -> Mitigation: implement gate checks as optional, exact-match constraints; concert-level assignments remain valid when no gate is required.
- [Risk] `/admin/*` naming may obscure whether a route is organizer-admin or platform-admin. -> Mitigation: apply the route permission matrix above and cover representative tests for both route families.
- [Risk] Prisma enum/model naming differs from domain names. -> Mitigation: keep mapping inside `PrismaAccessControlRepository` and use domain-owned strings/enums in inner layers.

## Migration Plan

1. Verify the current Prisma schema contains `Concert.createdById` and `CheckinStaffAssignment`.
2. If the local generated Prisma client is stale, regenerate it after any schema verification or fixture changes.
3. Add identity domain errors, ports, application use cases, and Prisma adapters.
4. Register providers and exports in `AuthModule`.
5. Add focused tests with in-memory ports for use cases and mocked request contexts for guards/controllers.
6. Run lint, unit tests, and any database schema/seed tests that cover assignment data.

Rollback is straightforward because the expected implementation is additive: remove the new identity providers, adapters, tests, and any seed fixture changes. No destructive data migration is planned.

## Open Questions

- None blocking. The default decision is that organizers may assign check-in staff for their own concerts, while admins may assign staff for any concert.
