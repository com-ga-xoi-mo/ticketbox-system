## MODIFIED Requirements

### Requirement: JWT-based session for protected actions
The system SHALL use stateless JWT access tokens (not server-side sessions) to maintain an authenticated session for protected actions. Tokens SHALL be included in requests as `Authorization: Bearer <token>` headers, and authenticated profile responses SHALL follow the shared public profile contract while preserving the current verified-JWT authorization snapshot.

#### Scenario: Authenticated user accesses own profile
- **WHEN** an authenticated user sends `GET /me/profile` with a valid JWT
- **THEN** the system SHALL return `id` and public `RoleCode` values from the verified JWT principal together with safe persisted profile fields including `email`, `displayName`, `phone`, `dateOfBirth` (ISO 8601 UTC string or null), `gender` (one of `MALE | FEMALE | OTHER` or null), `addressLine`, `city`, `district`, `avatarAssetId`, and `avatarUrl` (the linked asset's stored `publicUrl`, or null)
- **AND** the response SHALL NOT expose password, repository, or persistence-internal data

#### Scenario: Profile enrichment does not reauthorize roles
- **WHEN** the authenticated user's persisted role relations differ from the roles in the already verified JWT
- **THEN** `GET /me/profile` SHALL use the JWT principal roles for the response and SHALL NOT reload, replace, merge, or compare them with database roles during this change

#### Scenario: New user defaults to AUDIENCE role on registration
- **WHEN** a user successfully registers via `POST /auth/register`
- **THEN** the system SHALL assign the `AUDIENCE` role to the user and include it in the returned JWT

### Requirement: Admin user account management
The system SHALL allow authenticated ADMIN users to create, list, read, update, deactivate, and reactivate user accounts with any supported role. Admin-created accounts SHALL use an admin-supplied password and SHALL NOT issue an authentication token from the create endpoint. Admin user projections and mutations SHALL include supported non-avatar profile fields; avatar fields are read-only metadata in admin user responses.

#### Scenario: Admin creates user with roles
- **WHEN** an authenticated ADMIN submits email, password, display name, one or more roles, and optional profile fields to `POST /admin/users`
- **THEN** the system SHALL hash the supplied password, create the user, assign the requested roles, persist supported profile fields, and return a safe user projection with `id`, `email`, `displayName`, `phone`, `dateOfBirth`, `gender`, `addressLine`, `city`, `district`, `avatarAssetId`, `avatarUrl`, `roles`, and `status`
- **AND** the response SHALL NOT include `passwordHash` or an access token

#### Scenario: Non-admin cannot create user
- **WHEN** an authenticated user without ADMIN role submits `POST /admin/users`
- **THEN** the system SHALL reject the request as forbidden

#### Scenario: Duplicate email is rejected
- **WHEN** an admin creates a user with an email already registered to another account
- **THEN** the system SHALL reject the request with a conflict error

#### Scenario: Admin lists users by role and status
- **WHEN** an authenticated ADMIN requests `GET /admin/users` with optional `role` or `status` filters
- **THEN** the system SHALL return safe user projections matching the filters, including supported profile fields and avatar references

#### Scenario: Admin reads user detail
- **WHEN** an authenticated ADMIN requests `GET /admin/users/:id` for an existing user
- **THEN** the system SHALL return a safe user projection with roles, status, supported profile fields, and avatar reference

#### Scenario: Missing user returns not found
- **WHEN** an authenticated ADMIN requests `GET /admin/users/:id` for a missing user
- **THEN** the system SHALL return a not-found error

#### Scenario: Admin updates user profile and roles
- **WHEN** an authenticated ADMIN submits `PATCH /admin/users/:id` with display name, supported profile fields, email, or roles
- **THEN** the system SHALL update the submitted user fields and role assignments atomically
- **AND** the system SHALL validate all submitted roles against supported role values

#### Scenario: Admin cannot assign avatar metadata directly
- **WHEN** an authenticated ADMIN submits `avatarAssetId`, `avatarUrl`, or an avatar file payload to `POST /admin/users` or `PATCH /admin/users/:id`
- **THEN** the system SHALL reject or ignore those avatar mutation fields without changing the target user's avatar
- **AND** avatar changes SHALL remain available only through current-user avatar endpoints

#### Scenario: Admin cannot change user password through account update
- **WHEN** an authenticated ADMIN submits password, passwordHash, or passwordRaw fields to `PATCH /admin/users/:id`
- **THEN** the system SHALL reject or ignore those password mutation fields without changing the target user's password
- **AND** password changes after account creation SHALL remain available only through current-user password change

#### Scenario: Admin safe projection excludes secrets
- **WHEN** an authenticated ADMIN creates, lists, reads, or updates a user account
- **THEN** the response SHALL NOT include `passwordHash`, raw passwords, or authentication tokens

#### Scenario: Removing check-in role revokes active assignments
- **WHEN** an authenticated ADMIN updates a user so their roles no longer include `CHECKIN_STAFF`
- **THEN** the system SHALL revoke that user's active check-in staff assignments without deleting assignment history

#### Scenario: Admin deactivates user
- **WHEN** an authenticated ADMIN submits `PATCH /admin/users/:id/status` with a non-active status such as `DISABLED`
- **THEN** the system SHALL set the user's status without hard-deleting the user
- **AND** the system SHALL revoke that user's active check-in staff assignments

#### Scenario: Admin reactivates user
- **WHEN** an authenticated ADMIN submits `PATCH /admin/users/:id/status` with `ACTIVE`
- **THEN** the system SHALL reactivate the user without automatically restoring previously revoked check-in assignments

## ADDED Requirements

### Requirement: Current user updates own editable profile
The system SHALL allow any authenticated user with a supported role to update only their editable profile fields through `PATCH /me/profile`. The endpoint follows merge-patch semantics: only keys present in the request body are applied; omitted keys leave existing values unchanged.

#### Scenario: Authenticated user updates editable profile fields
- **WHEN** an authenticated user submits `PATCH /me/profile` with one or more of `displayName`, `phone`, `dateOfBirth`, `gender`, `addressLine`, `city`, or `district`
- **THEN** the system SHALL validate and persist only those submitted editable profile fields for the authenticated user

#### Scenario: Unauthenticated profile update is rejected
- **WHEN** a request without a valid JWT submits `PATCH /me/profile`
- **THEN** the system SHALL reject the request with `401 Unauthorized`

#### Scenario: Phone must be null or a fully valid number
- **WHEN** an authenticated user submits `PATCH /me/profile` with `phone: null`
- **THEN** the system SHALL clear the stored phone value
- **WHEN** an authenticated user submits `PATCH /me/profile` with a `phone` string that is 7–15 digits optionally prefixed with `+`
- **THEN** the system SHALL accept and persist the phone value
- **WHEN** an authenticated user submits `PATCH /me/profile` with a `phone` string that does not match the valid phone pattern (e.g., too short, non-digit characters)
- **THEN** the system SHALL reject the request with a `400 Bad Request` validation error

#### Scenario: Gender must be a valid enum value or null
- **WHEN** an authenticated user submits `PATCH /me/profile` with `gender` set to `MALE`, `FEMALE`, or `OTHER`
- **THEN** the system SHALL accept and persist the gender value
- **WHEN** an authenticated user submits `PATCH /me/profile` with an unrecognized `gender` value
- **THEN** the system SHALL reject the request with a `400 Bad Request` validation error

#### Scenario: Self profile update excludes privileged fields
- **WHEN** an authenticated user submits `PATCH /me/profile` with roles, status, email, password, or password hash
- **THEN** the system SHALL reject or ignore those protected fields without changing them

### Requirement: Current user changes own password
The system SHALL allow any authenticated user with a supported role to change their own password through `PATCH /me/password` by providing the correct current password and a valid new password.

#### Scenario: Authenticated user changes password successfully
- **WHEN** an authenticated user submits `PATCH /me/password` with their correct `currentPassword` and a `newPassword` of at least 8 characters
- **THEN** the system SHALL verify the current password, hash the new password, persist the new password hash for the authenticated user, and return a successful response without exposing password hashes

#### Scenario: Wrong current password is rejected
- **WHEN** an authenticated user submits `PATCH /me/password` with an incorrect `currentPassword`
- **THEN** the system SHALL reject the request with an authentication error
- **AND** the stored password hash SHALL remain unchanged

#### Scenario: Invalid new password is rejected
- **WHEN** an authenticated user submits `PATCH /me/password` with a `newPassword` shorter than 8 characters
- **THEN** the system SHALL reject the request with a `400 Bad Request` validation error
- **AND** the stored password hash SHALL remain unchanged

#### Scenario: Unauthenticated password change is rejected
- **WHEN** a request without a valid JWT submits `PATCH /me/password`
- **THEN** the system SHALL reject the request with `401 Unauthorized`

#### Scenario: Password change preserves current authorization state
- **WHEN** an authenticated user successfully changes their password
- **THEN** the system SHALL NOT change the user's roles, status, profile fields, avatar, or issue a replacement access token

### Requirement: Current user avatar upload
The system SHALL allow any authenticated user with a supported role to upload or replace their own avatar using existing object storage and asset metadata.

#### Scenario: Authenticated user uploads valid avatar
- **WHEN** an authenticated user sends `POST /me/avatar` with multipart field `file` containing a JPEG, PNG, or WebP file no larger than 2MB
- **THEN** the system SHALL call `storage.getPublicUrl(storageKey)` to compute `publicUrl` before writing to DB, store the object under `users/{userId}/avatar/{assetId}.{ext}`, create an `AssetKind.USER_AVATAR` asset row with that `publicUrl`, update `users.avatar_asset_id`, and return safe asset metadata including `avatarAssetId` and `avatarUrl` (the stored `publicUrl`)

#### Scenario: Avatar replacement transaction returns prior storage key
- **WHEN** a valid avatar upload is processed for a user who may already have an avatar
- **THEN** the persistence layer SHALL create the new `USER_AVATAR` asset, update `users.avatar_asset_id`, and return the prior avatar storage key from one database transaction so storage cleanup can run after commit

#### Scenario: Invalid avatar upload is rejected
- **WHEN** an authenticated user uploads a non-image file, unsupported image type, or file larger than 2MB to `POST /me/avatar`
- **THEN** the system SHALL reject the request without changing the user's current avatar

#### Scenario: Unauthenticated avatar upload is rejected
- **WHEN** a request without a valid JWT submits `POST /me/avatar`
- **THEN** the system SHALL reject the request with `401 Unauthorized`

#### Scenario: Replacing avatar deletes previous object after commit
- **WHEN** a user with an existing avatar successfully uploads a replacement avatar
- **THEN** the system SHALL update the user to the new avatar asset
- **AND** the system SHALL delete the previous avatar object from storage after the database update succeeds

#### Scenario: Failed database update cleans up new object
- **WHEN** the system uploads a new avatar object but fails to create the asset metadata or update the user record
- **THEN** the system SHALL delete the newly uploaded object from storage
- **AND** the user's previous avatar SHALL remain unchanged

### Requirement: Current user avatar removal
The system SHALL allow any authenticated user with a supported role to remove their current avatar.

#### Scenario: Authenticated user removes current avatar
- **WHEN** an authenticated user sends `DELETE /me/avatar` while they have an avatar
- **THEN** the system SHALL clear `users.avatar_asset_id`
- **AND** the system SHALL delete the former avatar object from storage

#### Scenario: Removing missing avatar is idempotent
- **WHEN** an authenticated user sends `DELETE /me/avatar` while they do not have an avatar
- **THEN** the system SHALL return a successful current profile or empty-avatar response without failing

#### Scenario: Unauthenticated avatar removal is rejected
- **WHEN** a request without a valid JWT submits `DELETE /me/avatar`
- **THEN** the system SHALL reject the request with `401 Unauthorized`

### Requirement: User profile schema remains bulk-compatible
The user table schema SHALL keep all newly added profile fields nullable so existing users and generated staff accounts remain valid without profile data.

#### Scenario: Existing user has no profile fields
- **WHEN** an existing user row has null phone, date of birth, gender, address, city, district, or avatar asset
- **THEN** profile and admin user APIs SHALL return the user successfully with null profile values
