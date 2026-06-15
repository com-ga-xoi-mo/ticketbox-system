## Why

TicketBox has JWT authentication and base role guards, but the target system still needs enforceable admin, organizer, and check-in authorization before protected concert and gate workflows can be implemented safely. This change turns the blueprint access-control model into concrete backend contracts, ownership checks, staff assignments, and permission tests while preserving strict hexagonal boundaries.

## What Changes

- Add admin-only route protection for administrative backend endpoints using existing JWT and role guard primitives.
- Add organizer ownership authorization so organizers can manage only concerts they own unless an admin override is explicitly allowed.
- Add a check-in staff assignment model that authorizes staff per concert and optionally per gate.
- Add application ports and use cases for access decisions so controllers and future concert/check-in modules do not perform direct database or ORM checks.
- Add permission tests for admin access, organizer ownership, check-in staff assignment, and negative authorization paths.
- No breaking changes to public authentication endpoints are expected.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `identity-access`: Add concrete admin authorization, organizer ownership authorization, and check-in staff assignment behavior.
- `rbac-guards`: Extend guarded-route coverage with admin/check-in permission scenarios and preserve 401-before-403 behavior.
- `concert-management`: Require organizer ownership or admin authorization for concert administration actions.
- `checkin-offline-sync`: Require assigned check-in staff authorization before online check-in or offline sync acceptance.

## Impact

- Affects `packages/backend/src/identity` domain, application, HTTP adapter, infrastructure repository adapters, and tests.
- May add database tables or Prisma models for organizer-concert ownership and check-in staff assignments, depending on what prior migrations expose.
- Establishes injectable authorization ports that future concert, check-in, and VIP guest-list gate modules can depend on without importing identity infrastructure directly.
- Adds unit and integration-style permission tests for role, ownership, and staff assignment decisions.
