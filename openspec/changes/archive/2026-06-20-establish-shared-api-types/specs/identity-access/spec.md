## MODIFIED Requirements

### Requirement: JWT-based session for protected actions
The system SHALL use stateless JWT access tokens (not server-side sessions) to maintain an authenticated session for protected actions. Tokens SHALL be included in requests as `Authorization: Bearer <token>` headers, and authenticated profile responses SHALL follow the shared public profile contract while preserving the current verified-JWT authorization snapshot.

#### Scenario: Authenticated user accesses own profile
- **WHEN** an authenticated user sends `GET /me/profile` with a valid JWT
- **THEN** the system SHALL return `id` and public `RoleCode` values from the verified JWT principal together with `email` and `displayName` from a safe profile projection, without exposing password, repository, or persistence data

#### Scenario: Profile enrichment does not reauthorize roles
- **WHEN** the authenticated user's persisted role relations differ from the roles in the already verified JWT
- **THEN** `GET /me/profile` SHALL use the JWT principal roles for the response and SHALL NOT reload, replace, merge, or compare them with database roles during this change

#### Scenario: Existing authorization components remain unchanged
- **WHEN** profile enrichment is implemented
- **THEN** the system SHALL preserve the current `JwtStrategy`, `RolesGuard`, token claims, token expiration behavior, and protected-route authorization semantics

#### Scenario: New user defaults to AUDIENCE role on registration
- **WHEN** a user successfully registers via `POST /auth/register`
- **THEN** the system SHALL assign the `AUDIENCE` role to the user and include it in the returned JWT
