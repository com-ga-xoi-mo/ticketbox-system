## ADDED Requirements

### Requirement: JWT-based session for protected actions
The system SHALL use stateless JWT access tokens (not server-side sessions) to maintain an authenticated session for protected actions. Tokens SHALL be included in requests as `Authorization: Bearer <token>` headers.

#### Scenario: Authenticated user accesses own profile
- **WHEN** an authenticated user sends `GET /me/profile` with a valid JWT
- **THEN** the system SHALL return the user's own profile data

#### Scenario: New user defaults to AUDIENCE role on registration
- **WHEN** a user successfully registers via `POST /auth/register`
- **THEN** the system SHALL assign the `AUDIENCE` role to the user and include it in the returned JWT
