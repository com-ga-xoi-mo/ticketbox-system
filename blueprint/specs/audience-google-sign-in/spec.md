# audience-google-sign-in

## Purpose
TBD - created by syncing change add-google-sign-in-for-audience. Google sign-in for the audience app: backend Google credential verification, audience-scoped session issuance, first-login provisioning, explicit account linking, login page integration, and environment-scoped client configuration. Update Purpose after archive.

## Requirements

### Requirement: Backend verifies Google identity credentials
The system SHALL expose `POST /auth/google` accepting a shared-contract request containing only a non-empty Google ID token `credential`, and SHALL verify that credential server-side using the configured Google Web Application client ID before trusting any identity claim.

#### Scenario: Valid Google credential is accepted
- **WHEN** the endpoint receives a Google ID token with a valid signature, accepted issuer, matching audience, unexpired lifetime, non-empty `sub`, valid email, and `email_verified` equal to true
- **THEN** the system SHALL pass a safe verified projection containing provider subject, email, optional display name, and optional picture URL to the Google sign-in use case

#### Scenario: Invalid Google credential is rejected generically
- **WHEN** the credential has an invalid signature, issuer, audience, lifetime, subject, email, or verified-email claim
- **THEN** the system SHALL return `401 Unauthorized` without issuing a TicketBox token or revealing which verification check failed

#### Scenario: Google claims supplied outside the credential are not trusted
- **WHEN** a client supplies an email, display name, picture URL, TicketBox user ID, or role outside the verified Google credential
- **THEN** the system SHALL reject or ignore those fields and SHALL NOT use them for identity, provisioning, or authorization

#### Scenario: Raw Google credential remains ephemeral
- **WHEN** the backend processes a Google sign-in request
- **THEN** the system SHALL NOT log, persist, echo, or place the raw Google ID token in the TicketBox JWT

### Requirement: Returning Google identity receives an audience-scoped TicketBox session
The system SHALL identify a returning Google user by the unique `(GOOGLE, providerSubject)` identity, require the linked TicketBox user to be `ACTIVE` with a current `AUDIENCE` role, and return the canonical `{ accessToken }` response containing a TicketBox JWT scoped only to `AUDIENCE`.

#### Scenario: Active returning audience user signs in
- **WHEN** a verified Google subject is linked to an `ACTIVE` TicketBox user whose current roles include `AUDIENCE`
- **THEN** the system SHALL return `200` with a TicketBox JWT whose `sub` is the TicketBox user UUID and whose roles contain only `AUDIENCE`

#### Scenario: Privileged roles are excluded from the audience token
- **WHEN** the linked active user has `AUDIENCE` together with `ADMIN`, `ORGANIZER`, or `CHECKIN_STAFF`
- **THEN** the JWT issued by `POST /auth/google` SHALL contain only `AUDIENCE` and SHALL NOT authorize privileged portal actions

#### Scenario: Linked user without audience role is rejected
- **WHEN** the linked active user's current roles do not include `AUDIENCE`
- **THEN** the system SHALL return generic `401 Unauthorized` and SHALL NOT issue a token or change the user's roles

#### Scenario: Returning login refreshes provider profile metadata
- **WHEN** the verified Google email, display name, or picture differs from stored provider metadata
- **THEN** the system SHALL update the provider metadata without replacing the TicketBox user's editable profile or managed avatar

#### Scenario: Disabled linked user is rejected
- **WHEN** a verified Google subject is linked to a TicketBox user whose status is not `ACTIVE`
- **THEN** the system SHALL return `401 Unauthorized`, SHALL NOT issue a token, and SHALL NOT create a replacement account

### Requirement: First Google sign-in atomically provisions an audience account
The system SHALL create a new TicketBox user, assign only the `AUDIENCE` role, and create the Google identity in one database transaction when a verified Google subject and canonical `trim().toLowerCase()` email are both unknown to TicketBox.

#### Scenario: New Google account is provisioned
- **WHEN** a verified Google identity has no provider-subject match and its canonical normalized email is not registered
- **THEN** the system SHALL atomically create an `ACTIVE` user with that unique normalized email, a null password hash, a display-name fallback when needed, one `AUDIENCE` role assignment, and an `AuthIdentity` keyed by `(GOOGLE, sub)`
- **AND** the system SHALL return the canonical TicketBox access token response

#### Scenario: Provisioning failure leaves no partial account
- **WHEN** user creation, role assignment, or identity creation fails
- **THEN** the transaction SHALL roll back all provisioning writes and SHALL NOT issue a token

#### Scenario: Concurrent first login is idempotent by provider subject
- **WHEN** concurrent requests attempt to provision the same verified Google subject
- **THEN** database uniqueness and conflict recovery SHALL result in at most one TicketBox user and one Google identity for that subject

### Requirement: Existing email requires explicit account linking
The system SHALL NOT automatically link a new Google subject to any existing TicketBox user based only on matching email.

#### Scenario: Existing email is rejected with linking guidance
- **WHEN** the verified Google subject is unknown but its `trim().toLowerCase()` email matches an existing user's normalized email, including a case or surrounding-whitespace variant
- **THEN** the endpoint SHALL return `409 Conflict` with stable code `ACCOUNT_LINK_REQUIRED` and SHALL NOT issue a token, create an identity, add a role, or modify the existing user

#### Scenario: Privileged account is not exposed through audience Google login
- **WHEN** the matching existing email belongs to a user with `ADMIN`, `ORGANIZER`, or `CHECKIN_STAFF` roles
- **THEN** the system SHALL apply the same account-link-required rejection and SHALL NOT return those roles through the audience flow

### Requirement: Audience login page offers resilient Google sign-in
The audience `/login` page SHALL preserve email/password login and add an official Google Identity Services control that submits only the callback credential to `POST /auth/google`, consumes the TicketBox access token, and preserves the existing post-login destination behavior.

#### Scenario: Google sign-in establishes the existing audience session
- **WHEN** Google returns a credential and `POST /auth/google` returns a valid TicketBox access token
- **THEN** the app SHALL call the existing `AuthContext.signIn`, store the TicketBox token, and navigate to `returnTo`, the prior protected route, or `/`

#### Scenario: Account-link-required error is actionable
- **WHEN** Google sign-in returns `ACCOUNT_LINK_REQUIRED`
- **THEN** the page SHALL keep the user signed out and instruct them to use their existing password login before a future linking flow

#### Scenario: Invalid or disabled Google login is safe
- **WHEN** Google sign-in returns `401`
- **THEN** the page SHALL show a generic Google sign-in failure without exposing raw backend or provider details

#### Scenario: Missing Google configuration does not break password login
- **WHEN** the Google client ID is absent or the Google client script cannot load
- **THEN** the Google control SHALL be unavailable with a safe state while the email/password form remains usable

#### Scenario: Repeated interaction does not submit concurrent credentials
- **WHEN** a Google sign-in request is already in progress
- **THEN** the page SHALL prevent duplicate Google submissions until the request completes

### Requirement: Google sign-in uses environment-scoped public client configuration
The system SHALL configure Google verification with `GOOGLE_CLIENT_ID`, configure the audience client with `VITE_GOOGLE_CLIENT_ID`, and document matching Authorized JavaScript origins without placing a Google client secret or a real local client ID in tracked frontend source.

#### Scenario: Local development uses an authorized origin
- **WHEN** the audience app runs at `http://localhost:5173`
- **THEN** documentation SHALL require that exact origin in the Google Web Application client and SHALL use environment variables rather than a hard-coded client ID

#### Scenario: Automated tests do not call Google
- **WHEN** backend or frontend automated tests exercise Google sign-in behavior
- **THEN** they SHALL use injected fakes or mocks and SHALL NOT contain a real Google ID token or require Google network availability

### Requirement: Audience register page offers Google sign-in as an alternative to email registration
The audience `/register` page SHALL include the same official Google Identity Services control as the login page, allowing users to create an account or sign in via Google directly from the registration flow. The control SHALL use the same backend endpoint `POST /auth/google` and the same `AuthContext.signIn` integration.

#### Scenario: Google sign-in from register page provisions a new account
- **WHEN** a user on the `/register` page clicks the Google sign-in control and Google returns a credential for an email not yet registered in TicketBox
- **THEN** the frontend SHALL call `POST /auth/google`, the backend SHALL atomically provision a new `AUDIENCE` account, and the frontend SHALL call `AuthContext.signIn` and navigate to `/` or the intended destination

#### Scenario: Google sign-in from register page signs in an existing account
- **WHEN** a user on the `/register` page uses Google sign-in with a credential whose Google subject is already linked to a TicketBox account
- **THEN** the frontend SHALL call `POST /auth/google`, receive a valid access token, call `AuthContext.signIn`, and navigate to `/`, behaving identically to signing in from the login page

#### Scenario: Account-link-required error on register page is actionable
- **WHEN** the backend returns `ACCOUNT_LINK_REQUIRED` in response to Google sign-in on the register page
- **THEN** the page SHALL keep the user signed out and display a message directing them to log in using their existing email and password at `/login`

#### Scenario: Google sign-in failure on register page is safe
- **WHEN** Google sign-in on the register page returns a `401` error
- **THEN** the page SHALL display a generic error message without exposing raw backend or provider details, and the email/password registration form SHALL remain usable

#### Scenario: Missing Google configuration does not break email registration
- **WHEN** the Google client ID is absent or the Google client script cannot load on the register page
- **THEN** the Google control SHALL be hidden or shown in a disabled state, while the email/password registration form remains fully functional

