## MODIFIED Requirements

### Requirement: Audience auth session handling
The audience web app SHALL authenticate through either backend `POST /auth/login` email/password exchange or `POST /auth/google` Google credential exchange, store only the returned TicketBox access token, restore sessions from storage, and clear invalid sessions through centralized handling.

#### Scenario: Successful audience password login establishes session
- **WHEN** a user submits valid email/password credentials on the audience login route
- **THEN** the app SHALL call `POST /auth/login`, store the returned TicketBox access token, and establish a session from the decoded token subject and roles

#### Scenario: Successful audience Google login establishes the same session type
- **WHEN** Google sign-in returns a credential and `POST /auth/google` returns an access token
- **THEN** the app SHALL store only the returned TicketBox access token and establish the same AuthContext session used by password login

#### Scenario: Audience login rejects invalid credentials
- **WHEN** either backend authentication endpoint rejects an audience login attempt with `401`
- **THEN** the app SHALL show a method-appropriate inline or form-level error and SHALL NOT establish a session

#### Scenario: Stored token is restored on startup
- **WHEN** the app starts and a decodable TicketBox access token exists in browser storage
- **THEN** the app SHALL restore the session state from the token subject and roles

#### Scenario: Malformed stored token is discarded
- **WHEN** the app starts and the stored token cannot be decoded into a usable session
- **THEN** the app SHALL clear the stored token and treat the visitor as signed out

#### Scenario: Google credential is not stored as session state
- **WHEN** the Google callback supplies an ID token credential
- **THEN** the app SHALL exchange it with the backend and SHALL NOT persist it in TicketBox token storage

### Requirement: Existing backend and shared packages are reused
The audience web app SHALL reuse existing backend APIs and shared packages where available, and SHALL add only the Google authentication endpoint and shared contract support needed for audience Google sign-in.

#### Scenario: Public catalog uses existing backend routes
- **WHEN** the audience app reads public event catalog data for foundation pages
- **THEN** it SHALL use existing public concert catalog routes before introducing new backend endpoints

#### Scenario: Password auth uses existing backend route
- **WHEN** the audience app authenticates with email and password
- **THEN** it SHALL use the existing `POST /auth/login` backend route

#### Scenario: Google auth uses the dedicated backend exchange
- **WHEN** the audience app receives a Google ID token credential
- **THEN** it SHALL use `POST /auth/google` and SHALL consume the same canonical access-token response as password login

#### Scenario: Shared contracts are preferred over app-local wire types
- **WHEN** an audience API response has a contract exported by `@ticketbox/api-types`
- **THEN** the audience app SHALL validate or type the response through that shared contract instead of duplicating the wire type locally

#### Scenario: Backend additions remain scoped
- **WHEN** Google sign-in behavior is added
- **THEN** the implementation SHALL keep Google verification and provisioning within the identity boundary and SHALL NOT change organizer/admin portal authentication
