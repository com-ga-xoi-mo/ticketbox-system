## MODIFIED Requirements

### Requirement: User login with credential validation
The system SHALL allow a registered user with a local password to log in by submitting their email and password, resolving the account through `email.trim().toLowerCase()` and the unique normalized email key. On success, the system SHALL return a JWT access token using the canonical shared login response contract; profile data SHALL be obtained through the authenticated profile endpoint rather than embedded in the login response. The system SHALL not reveal whether an email exists, has no local password, or is disabled when rejecting invalid credentials.

#### Scenario: Successful login
- **WHEN** a client sends `POST /auth/login` with a registered email whose password hash is present and the correct password
- **THEN** the system SHALL return a `200` response containing a signed JWT access token whose payload includes the user's `sub` (user ID) and `roles`, and the response SHALL NOT require an embedded staff profile

#### Scenario: Client loads profile after login
- **WHEN** a client needs profile data after successful login
- **THEN** the client SHALL call the authenticated `GET /me/profile` endpoint with the returned bearer token and validate the response using the shared profile contract

#### Scenario: Email casing and surrounding whitespace do not change account identity
- **WHEN** a client submits the correct password with an email that differs from the stored display email only by case or surrounding whitespace
- **THEN** the system SHALL resolve the same normalized user account and apply the normal login result

#### Scenario: Wrong password is rejected
- **WHEN** a client sends `POST /auth/login` with a registered email and an incorrect password
- **THEN** the system SHALL return a `401 Unauthorized` error without indicating whether the email exists

#### Scenario: Unregistered email is rejected
- **WHEN** a client sends `POST /auth/login` with an email that does not exist in the system
- **THEN** the system SHALL return a `401 Unauthorized` error with the same response shape as an incorrect password rejection

#### Scenario: OAuth-only account is rejected without bcrypt comparison
- **WHEN** a client sends `POST /auth/login` for a registered user whose password hash is null
- **THEN** the system SHALL return the same `401 Unauthorized` response as other invalid credentials and SHALL NOT call the password hasher with a null hash
