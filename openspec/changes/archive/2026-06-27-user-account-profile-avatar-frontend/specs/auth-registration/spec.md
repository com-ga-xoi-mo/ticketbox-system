## MODIFIED Requirements

### Requirement: User self-registration
The system SHALL allow a new user to register by providing a valid email, password, and display name, with optional phone number capture. The password SHALL be hashed with bcrypt before storage. Upon successful registration, the system SHALL return a JWT access token.

#### Scenario: Successful registration
- **WHEN** a client sends `POST /auth/register` with a unique email, a password of at least 8 characters, a display_name, and optionally phone
- **THEN** the system SHALL create a new user record with the `AUDIENCE` role, hash the password with bcrypt, persist the phone value when provided, and return a `201` response containing a signed JWT access token

#### Scenario: Duplicate email is rejected
- **WHEN** a client sends `POST /auth/register` with an email that already exists in the system
- **THEN** the system SHALL return a `409 Conflict` error without exposing internal user data

#### Scenario: Invalid input is rejected
- **WHEN** a client sends `POST /auth/register` with a missing email, a password shorter than 8 characters, a missing display_name, or an invalid phone value
- **THEN** the system SHALL return a `400 Bad Request` error with validation details

## ADDED Requirements

### Requirement: Audience registration page
The audience web app SHALL provide a registration page at `/register` when no audience registration page exists. The login page SHALL link to `/register`.

#### Scenario: User opens registration from login
- **WHEN** an audience visitor clicks the registration link on `/login`
- **THEN** the system navigates to `/register`

#### Scenario: User submits registration successfully
- **WHEN** an audience visitor submits valid email, password, display name, and optional phone on `/register`
- **THEN** the frontend sends `POST /auth/register`
- **AND** stores the returned access token through the audience auth context
- **AND** redirects the user using the same post-auth destination behavior as login

### Requirement: Audience registration form captures phone
The audience registration UI SHALL include an optional phone field and submit it only when provided.

#### Scenario: User registers with phone
- **WHEN** an audience user fills phone during registration
- **THEN** the frontend includes `phone` in the registration request payload

#### Scenario: User registers without phone
- **WHEN** an audience user leaves phone empty during registration
- **THEN** the frontend allows registration to proceed without a phone value
