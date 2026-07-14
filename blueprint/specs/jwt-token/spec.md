## ADDED Requirements

### Requirement: JWT access token issuance
The system SHALL sign JWT access tokens using a secret loaded from environment configuration. The token payload SHALL include `sub` (user UUID) and `roles` (array of Role enum values). Tokens SHALL carry a configurable expiry (default 1 hour).

#### Scenario: Valid token is accepted on protected routes
- **WHEN** a client sends a request to a JWT-protected route with a valid `Authorization: Bearer <token>` header
- **THEN** the system SHALL decode the token, populate the authenticated user context (`req.user`), and proceed to the route handler

#### Scenario: Expired token is rejected
- **WHEN** a client sends a request with an expired JWT token
- **THEN** the system SHALL return a `401 Unauthorized` error

#### Scenario: Tampered token is rejected
- **WHEN** a client sends a request with a JWT token whose signature does not match the system secret
- **THEN** the system SHALL return a `401 Unauthorized` error

#### Scenario: Missing token is rejected on protected routes
- **WHEN** a client sends a request to a JWT-protected route without an `Authorization` header
- **THEN** the system SHALL return a `401 Unauthorized` error
