## ADDED Requirements

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
