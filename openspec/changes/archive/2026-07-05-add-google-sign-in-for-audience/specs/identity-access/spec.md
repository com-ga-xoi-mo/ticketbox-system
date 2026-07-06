## MODIFIED Requirements

### Requirement: JWT-based session for protected actions
The system SHALL use stateless TicketBox JWT access tokens (not server-side or Google sessions) to maintain an authenticated session for protected actions. Tokens SHALL be included in requests as `Authorization: Bearer <token>` headers, and authenticated profile responses SHALL follow the shared public profile contract while preserving the current verified-JWT authorization snapshot.

#### Scenario: Authenticated user accesses own profile
- **WHEN** an authenticated user sends `GET /me/profile` with a valid TicketBox JWT
- **THEN** the system SHALL return `id` and public `RoleCode` values from the verified JWT principal together with safe persisted profile fields including `email`, `displayName`, `phone`, `dateOfBirth` (ISO 8601 UTC string or null), `gender` (one of `MALE | FEMALE | OTHER` or null), `addressLine`, `city`, `district`, `avatarAssetId`, `avatarUrl` (the linked asset's stored `publicUrl`, or null), `hasPassword`, `authProviders`, and `externalAvatarUrl`
- **AND** the response SHALL NOT expose password hashes, provider subjects, provider records, Google credentials, repository data, or other persistence-internal data

#### Scenario: Profile enrichment does not reauthorize roles
- **WHEN** the authenticated user's persisted role relations differ from the roles in the already verified JWT
- **THEN** `GET /me/profile` SHALL use the JWT principal roles for the response and SHALL NOT reload, replace, merge, or compare them with database roles during this change

#### Scenario: New user defaults to AUDIENCE role on registration
- **WHEN** a user successfully registers via `POST /auth/register`
- **THEN** the system SHALL assign the `AUDIENCE` role to the user and include it in the returned JWT

#### Scenario: Google picture remains external profile metadata
- **WHEN** a current user has a verified Google picture but no managed TicketBox avatar
- **THEN** `externalAvatarUrl` SHALL contain the optional Google picture URL while `avatarAssetId` and `avatarUrl` remain null

### Requirement: Current user changes own password
The system SHALL allow an authenticated user who has a local password to change that password through `PATCH /me/password` by providing the correct current password and a valid new password. An OAuth-only user without a password hash SHALL be rejected safely and SHALL NOT be assigned an implicit password by this endpoint.

#### Scenario: Authenticated user changes password successfully
- **WHEN** an authenticated user with a local password submits `PATCH /me/password` with their correct `currentPassword` and a `newPassword` of at least 8 characters
- **THEN** the system SHALL verify the current password, hash the new password, persist the new password hash for the authenticated user, and return a successful response without exposing password hashes

#### Scenario: Wrong current password is rejected
- **WHEN** an authenticated user with a local password submits `PATCH /me/password` with an incorrect `currentPassword`
- **THEN** the system SHALL reject the request with an authentication error
- **AND** the stored password hash SHALL remain unchanged

#### Scenario: OAuth-only password change is rejected safely
- **WHEN** an authenticated user whose password hash is null submits `PATCH /me/password`
- **THEN** the system SHALL reject the request without invoking bcrypt comparison, creating a random password, or changing authentication providers

#### Scenario: Invalid new password is rejected
- **WHEN** an authenticated user submits `PATCH /me/password` with a `newPassword` shorter than 8 characters
- **THEN** the system SHALL reject the request with a `400 Bad Request` validation error
- **AND** the stored password hash SHALL remain unchanged

#### Scenario: Unauthenticated password change is rejected
- **WHEN** a request without a valid JWT submits `PATCH /me/password`
- **THEN** the system SHALL reject the request with `401 Unauthorized`

#### Scenario: Password change preserves current authorization state
- **WHEN** an authenticated user successfully changes their password
- **THEN** the system SHALL NOT change the user's roles, status, profile fields, avatar, authentication-provider records, or issue a replacement access token

## ADDED Requirements

### Requirement: Canonical user email identity
The system SHALL persist `normalizedEmail = email.trim().toLowerCase()` as a required unique user identity key while retaining `email` as the user-facing contact value. All account creation, email update, authentication, and Google collision paths SHALL derive and use the same canonical value.

#### Scenario: Every user creation path writes normalized email
- **WHEN** registration, admin account creation, check-in staff provisioning, seed setup, or Google first-login creates a user
- **THEN** the system SHALL persist the canonical normalized email in the same write as the user record

#### Scenario: User email update keeps canonical identity synchronized
- **WHEN** an authorized operation changes a user's email
- **THEN** the system SHALL update `email` and `normalizedEmail` atomically and SHALL reject a normalized-email conflict

#### Scenario: Canonical duplicates are rejected
- **WHEN** a create or update uses an email differing from another user's email only by case or surrounding whitespace
- **THEN** the system SHALL reject the operation as a duplicate instead of creating two logical accounts

#### Scenario: Migration detects existing canonical duplicates
- **WHEN** the normalized-email migration finds two or more existing users with the same `trim().toLowerCase()` value
- **THEN** the migration or its required preflight SHALL stop and report the conflicting users for manual resolution rather than choosing or merging an account automatically
