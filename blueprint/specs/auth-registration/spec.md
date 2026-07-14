## Purpose
Define public user self-registration behavior, including default audience role assignment, credential handling, and optional profile input accepted during signup.

## Requirements

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

### Requirement: Audience registration page
The audience web app SHALL provide a registration page at `/register` when no audience registration page exists. The login page SHALL link to `/register`.

#### Scenario: User opens registration from login
- **WHEN** an unauthenticated audience visitor opens the login page
- **THEN** the page provides a link to `/register`

#### Scenario: User submits registration successfully
- **WHEN** an unauthenticated visitor submits valid registration details
- **THEN** the page sends `POST /auth/register`
- **AND** the app stores the returned token through the audience auth context
- **AND** the app redirects using the same post-login target behavior as the login page

### Requirement: Audience registration form captures phone
The audience registration form SHALL include an optional phone field and SHALL submit it only when provided.

#### Scenario: User registers with phone number
- **WHEN** an unauthenticated visitor submits registration with a valid phone number
- **THEN** the `POST /auth/register` request includes the phone number

#### Scenario: User registers without phone number
- **WHEN** an unauthenticated visitor submits registration without a phone number
- **THEN** the app allows registration and omits the phone field from the request payload
