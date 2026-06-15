## 1. Architecture and Existing Contract Review

- [x] 1.1 Review `blueprint/design.md`, `blueprint/specs/auth.md`, `blueprint/specs/checkin.md`, and the delta specs in this change before coding.
- [x] 1.2 Verify the current identity module structure and keep new files under `domain`, `application`, `adapters`, and `infrastructure` according to the existing pattern.
- [x] 1.3 Verify `prisma/schema.prisma` has `Concert.createdById`, `CheckinStaffAssignment`, `CheckinAssignmentStatus`, and relevant check-in result enums; do not add schema changes unless the contract is missing.

## 2. Domain Contracts

- [x] 2.1 Add domain authorization error types for forbidden admin access, forbidden concert ownership, missing check-in staff role, missing active assignment, and gate mismatch.
- [x] 2.2 Add a domain/application port for concert ownership lookup that returns the owner user ID for a concert without exposing Prisma types.
- [x] 2.3 Add a domain/application port for check-in staff assignment lookup and assignment persistence without exposing Prisma types.
- [x] 2.4 Define command/query interfaces for admin authorization, concert management authorization, staff assignment creation/revocation/listing, and check-in assignment authorization using concert and optional gate context only.

## 3. Application Use Cases

- [x] 3.1 Implement admin authorization use case that authorizes only authenticated users containing `Role.ADMIN`.
- [x] 3.2 Implement concert management authorization use case that allows owning organizers and explicit admin override paths.
- [x] 3.3 Implement check-in assignment authorization use case that requires `Role.CHECKIN_STAFF`, active concert assignment, and optional gate match.
- [x] 3.4 Implement staff assignment management use cases for assigning staff, revoking assignments, and listing assignments for a concert; allow owning organizers for their concerts and admins for any concert.
- [x] 3.5 Keep all use cases free of NestJS decorators, HTTP request/response types, Prisma imports, and infrastructure services.
- [x] 3.6 Ensure check-in assignment authorization can be reused by future VIP guest-list gate lookup without importing guest-list infrastructure into identity.

## 4. Infrastructure Adapters

- [x] 4.1 Implement a Prisma-backed concert ownership adapter that reads `Concert.createdById`.
- [x] 4.2 Implement a Prisma-backed check-in assignment adapter that reads and writes `CheckinStaffAssignment` records using `ACTIVE` and `REVOKED` status.
- [x] 4.3 Map Prisma enum/model values to identity-owned domain values inside the adapter only.
- [x] 4.4 Handle missing concerts, missing staff users, duplicate active assignments, and revoked assignments with deterministic domain/application errors.

## 5. HTTP Adapter and Module Wiring

- [x] 5.1 Register new ports, adapters, and use cases in `packages/backend/src/identity/auth.module.ts` using explicit provider bindings.
- [x] 5.2 Export the authorization use cases or ports needed by future concert and check-in modules while avoiding infrastructure exports.
- [x] 5.3 Add or update admin/staff assignment HTTP endpoints only if they fit the existing identity adapter scope; otherwise expose application providers for later modules.
- [x] 5.4 Ensure protected HTTP endpoints use `JwtAuthGuard` before `RolesGuard` and follow the route permission matrix from `design.md`.
- [x] 5.5 Ensure organizer-admin concert routes allow `ORGANIZER` or `ADMIN` at the guard layer, while platform-admin routes remain `ADMIN` only.

## 6. Tests

- [x] 6.1 Add unit tests for admin authorization allowed and denied paths.
- [x] 6.2 Add unit tests for concert ownership authorization: owner allowed, non-owner denied, and explicit admin override allowed.
- [x] 6.3 Add unit tests for check-in assignment authorization: assigned staff allowed, unassigned staff denied, revoked assignment denied, and gate mismatch denied.
- [x] 6.4 Add tests for staff assignment management: organizer owner can assign/revoke/list, organizer non-owner is denied, admin can assign for any concert, duplicate assignment handling, and non-staff assignment rejection.
- [x] 6.5 Add guard/controller tests that preserve `401 Unauthorized` for missing JWT before `403 Forbidden` role failures.
- [x] 6.6 Add tests that organizer-admin routes pass coarse role checks for organizers before ownership evaluation, while platform-admin routes deny non-admin users.
- [x] 6.7 Add Prisma adapter tests or repository-level tests for assignment lookup and persistence if the existing test setup can run against the local database.

## 7. Verification

- [x] 7.1 Run the relevant identity unit tests.
- [x] 7.2 Run lint/typecheck for the backend package.
- [x] 7.3 Run Prisma generate or schema validation if adapter changes rely on generated Prisma types.
- [x] 7.4 Run the broader backend test suite if local services are available; document any skipped database-dependent tests.
- [x] 7.5 Update task checkboxes and implementation notes with completed commands and any deviations from the design.
