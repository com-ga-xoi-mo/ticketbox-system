## MODIFIED Requirements

### Requirement: User self-registration
The system SHALL allow a new user to register by providing a valid email, password, and display name, with an optional phone number. The password SHALL be hashed with bcrypt before storage. Upon successful registration, the system SHALL return a JWT access token.

#### Scenario: Successful registration
- **WHEN** a client sends `POST /auth/register` with a unique email, a password of at least 8 characters, a display name, and optionally a phone number
- **THEN** the system SHALL create a new user record with the `AUDIENCE` role, hash the password with bcrypt, persist the phone number when provided, and return a `201` response containing a signed JWT access token

#### Scenario: Duplicate email is rejected
- **WHEN** a client sends `POST /auth/register` with an email that already exists in the system
- **THEN** the system SHALL return a `409 Conflict` error without exposing internal user data

#### Scenario: Invalid input is rejected
- **WHEN** a client sends `POST /auth/register` with a missing email, a password shorter than 8 characters, a missing display name, or a phone value that does not match the valid pattern (7–15 digits optionally prefixed with `+`)
- **THEN** the system SHALL return a `400 Bad Request` error with validation details
