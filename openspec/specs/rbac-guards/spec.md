## ADDED Requirements

### Requirement: Role-based endpoint protection via NestJS guards
The system SHALL provide `JwtAuthGuard`, `RolesGuard`, and `@Roles()` decorator. Controllers SHALL declare required roles using `@Roles()`. `JwtAuthGuard` SHALL validate the token first; `RolesGuard` SHALL enforce role membership after token validation. Routes annotated with both guards SHALL deny access if the authenticated user's roles do not satisfy the declared requirement.

#### Scenario: Authorized user with matching role accesses protected route
- **WHEN** an authenticated user whose token includes the required role calls an endpoint annotated with `@Roles(Role.ORGANIZER)`
- **THEN** the system SHALL allow the request to proceed to the route handler

#### Scenario: Authenticated user without required role is denied
- **WHEN** an authenticated user whose token only includes `AUDIENCE` role calls an endpoint annotated with `@Roles(Role.ORGANIZER)`
- **THEN** the system SHALL return a `403 Forbidden` error

#### Scenario: Unauthenticated user is rejected before role check
- **WHEN** a client without a valid JWT token calls a route protected by `JwtAuthGuard` and `RolesGuard`
- **THEN** the system SHALL return a `401 Unauthorized` error (not 403) before role evaluation occurs

### Requirement: Role enum definition
The system SHALL define a `Role` enum with values: `AUDIENCE`, `ORGANIZER`, `CHECKIN_STAFF`, `ADMIN`. This enum SHALL be the single source of truth for role identity across the backend codebase.

#### Scenario: ADMIN role grants access to admin-only routes
- **WHEN** an authenticated user with the `ADMIN` role calls an endpoint annotated with `@Roles(Role.ADMIN)`
- **THEN** the system SHALL allow the request to proceed

#### Scenario: CHECKIN_STAFF role is denied from admin-only routes
- **WHEN** an authenticated user with only `CHECKIN_STAFF` role calls an endpoint annotated with `@Roles(Role.ADMIN)`
- **THEN** the system SHALL return a `403 Forbidden` error

### Requirement: Protected admin and check-in routes use JWT before role checks
The system SHALL apply JWT authentication before role authorization on platform-admin, organizer-admin, and check-in protected routes.

#### Scenario: Unauthenticated admin request returns unauthorized
- **WHEN** a client without a valid JWT calls an admin route protected by `JwtAuthGuard` and `RolesGuard`
- **THEN** the system SHALL return a `401 Unauthorized` error before role evaluation occurs

#### Scenario: Authenticated non-admin admin request returns forbidden
- **WHEN** an authenticated user without the `ADMIN` role calls an admin route protected by `JwtAuthGuard` and `RolesGuard`
- **THEN** the system SHALL return a `403 Forbidden` error

#### Scenario: Organizer-admin route allows organizer role before ownership check
- **WHEN** an authenticated organizer calls an organizer-admin concert route protected by `JwtAuthGuard` and `RolesGuard`
- **THEN** the system SHALL allow role authorization to pass so the application use case can evaluate concert ownership

#### Scenario: Authenticated non-staff check-in request returns forbidden
- **WHEN** an authenticated user without the `CHECKIN_STAFF` role calls a check-in route protected by `JwtAuthGuard` and `RolesGuard`
- **THEN** the system SHALL return a `403 Forbidden` error before resource assignment checks run
