## ADDED Requirements

### Requirement: User login with credential validation
The system SHALL allow a registered user to log in by submitting their email and password. On success, the system SHALL return a JWT access token using the canonical shared login response contract; profile data SHALL be obtained through the authenticated profile endpoint rather than embedded in the login response. The system SHALL not reveal whether an email exists when rejecting invalid credentials.

#### Scenario: Successful login
- **WHEN** a client sends `POST /auth/login` with a registered email and the correct password
- **THEN** the system SHALL return a `200` response containing a signed JWT access token whose payload includes the user's `sub` (user ID) and `roles`, and the response SHALL NOT require an embedded staff profile

#### Scenario: Client loads profile after login
- **WHEN** a client needs profile data after successful login
- **THEN** the client SHALL call the authenticated `GET /me/profile` endpoint with the returned bearer token and validate the response using the shared profile contract

#### Scenario: Wrong password is rejected
- **WHEN** a client sends `POST /auth/login` with a registered email and an incorrect password
- **THEN** the system SHALL return a `401 Unauthorized` error without indicating whether the email exists

#### Scenario: Unregistered email is rejected
- **WHEN** a client sends `POST /auth/login` with an email that does not exist in the system
- **THEN** the system SHALL return a `401 Unauthorized` error with the same response shape as an incorrect password rejection
