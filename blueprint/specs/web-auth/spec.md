# Web Auth

## Purpose
TBD

## Requirements

### Requirement: Sign in with email and password

The web app SHALL authenticate a user by sending their email and password to the backend `POST /auth/login` endpoint and consuming the returned `{ accessToken }`. The app MUST NOT implement its own credential verification; the backend is the source of truth.

#### Scenario: Successful sign-in

- **WHEN** a user submits a valid email and password
- **THEN** the app calls `POST /auth/login` with `{ email, password }`
- **AND** on a `2xx` response it stores the returned `accessToken` and establishes a session

#### Scenario: Rejected credentials

- **WHEN** the backend responds `401` to a sign-in attempt
- **THEN** the app shows the message "Invalid credentials. Please try again." (matching the English UI copy)
- **AND** no session is established and the user remains on the login screen

### Requirement: Client-side form validation

The login form SHALL block submission and show inline errors when the email is empty or malformed, or the password is empty. Validation is a UX guard only; the backend remains authoritative.

#### Scenario: Invalid email blocks submit

- **WHEN** the user submits with an empty or malformed email
- **THEN** an inline error is shown on the email field
- **AND** no network request is made

#### Scenario: Empty password blocks submit

- **WHEN** the user submits with an empty password
- **THEN** an inline error is shown on the password field
- **AND** no network request is made

#### Scenario: Valid input passes validation

- **WHEN** the user submits a well-formed email and a non-empty password
- **THEN** validation passes and the sign-in request proceeds

### Requirement: Loading state and duplicate-submit prevention

While a sign-in request is in flight, the app SHALL show a loading state and prevent a second submission until the first resolves.

#### Scenario: Double submit prevented

- **WHEN** a sign-in request is already in flight
- **AND** the user activates submit again
- **THEN** no additional `POST /auth/login` request is made

### Requirement: Session persistence and restore

The app SHALL persist the access token in `localStorage` under a single key and restore the session from it on startup, decoding `{ sub, roles }` from the JWT for UX gating without verifying the signature.

#### Scenario: Session restored on reload

- **WHEN** a valid token exists in `localStorage` at startup
- **THEN** the app restores a session with `sub` and `roles` decoded from the token

#### Scenario: Malformed token yields no session

- **WHEN** the stored token is missing or cannot be decoded into `{ sub, roles }`
- **THEN** no session is established and the app treats the user as signed out

### Requirement: Redirect by role after sign-in

After a successful sign-in, the app SHALL route the user to a destination determined by their roles, applying a fixed precedence when a user holds more than one role: `ADMIN` outranks `ORGANIZER`. Organizers SHALL land on `/concerts` (the management surface); admins SHALL land on `/dashboard`. A user whose roles include neither `ADMIN` nor `ORGANIZER` (e.g. `CHECKIN_STAFF`, `AUDIENCE`) SHALL be routed to an access-denied destination rather than a portal page, to avoid a redirect loop.

#### Scenario: Organizer redirected to concerts

- **WHEN** sign-in succeeds and the decoded roles include `ORGANIZER` but not `ADMIN`
- **THEN** the app navigates to `/concerts`

#### Scenario: Admin precedence over organizer

- **WHEN** sign-in succeeds and the decoded roles include `ADMIN` (with or without `ORGANIZER`)
- **THEN** the app navigates to `/dashboard`

#### Scenario: User without a web role is denied

- **WHEN** sign-in succeeds but the decoded roles include neither `ADMIN` nor `ORGANIZER`
- **THEN** the app navigates to an access-denied page offering sign-out
- **AND** the user is NOT redirected back into `/login` (no loop)

### Requirement: Bearer header and centralized 401 handling

The shared API client SHALL attach `Authorization: Bearer <token>` to requests when a session token exists, and on any `401` response it SHALL clear the stored session and trigger a redirect to `/login`.

#### Scenario: Token attached when present

- **WHEN** a request is made and a session token exists
- **THEN** the request carries the `Authorization: Bearer <token>` header

#### Scenario: No token, no header

- **WHEN** a request is made and no session token exists
- **THEN** the request is sent without an `Authorization` header

#### Scenario: 401 clears session

- **WHEN** any API response returns `401`
- **THEN** the stored session is cleared and the unauthorized handler (redirect to `/login`) is invoked
