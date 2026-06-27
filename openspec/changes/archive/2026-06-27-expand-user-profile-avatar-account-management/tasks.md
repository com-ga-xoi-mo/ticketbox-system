## 1. Database and Contracts

- [x] 1.1 Add nullable user profile fields (`phone String?`, `dateOfBirth DateTime?`, `gender Gender?` where `Gender` is a new Prisma enum `MALE | FEMALE | OTHER`, `addressLine String?`, `city String?`, `district String?`, `avatarAssetId String?`), `USER_AVATAR` to `AssetKind` enum, and the user-avatar FK relation to Prisma schema and migration.
- [x] 1.2 Update generated Prisma types and schema tests for user profile columns, avatar foreign key, and `USER_AVATAR`.
- [x] 1.3 Extend shared auth/profile/admin account API contracts to include profile fields (`phone`, `dateOfBirth` as ISO 8601 string, `gender` as `MALE | FEMALE | OTHER` union, `addressLine`, `city`, `district`), avatar references (`avatarAssetId`, `avatarUrl`), profile update payloads (merge-patch semantics; phone validated as 7–15 digits or null; gender validated as enum or null), avatar responses, password change request/response schemas, and `USER_AVATAR` in shared asset kind validation.
- [x] 1.4 Update registration contracts and validation to accept optional phone while preserving default AUDIENCE role behavior.

## 2. Backend Profile and Avatar APIs

- [x] 2.1 Extend identity user repository ports, Prisma repository mapping, and safe user projections with nullable profile fields and avatar metadata.
- [x] 2.2 Update `GET /me/profile` to return profile fields plus `avatarAssetId` and derived `avatarUrl` without reauthorizing roles from persistence.
- [x] 2.3 Add `PATCH /me/profile` for authenticated users to update only editable profile fields.
- [x] 2.4 Add current-user password change use case and `PATCH /me/password` endpoint that verifies `currentPassword`, validates `newPassword` length >= 8, hashes and persists the new password, and does not issue a new token.
- [x] 2.5 Add avatar upload use case and `POST /me/avatar` endpoint using multipart field `file`, 2MB limit, and JPEG/PNG/WebP validation.
- [x] 2.6 Implement avatar repository transaction for replacement/removal that creates the new avatar asset, updates `users.avatarAssetId`, and returns the prior avatar storage key for post-commit cleanup.
- [x] 2.7 Implement avatar replacement cleanup: delete newly uploaded object on DB failure and delete previous avatar object after successful replacement.
- [x] 2.8 Add `DELETE /me/avatar` to clear current avatar and delete the former storage object idempotently.
- [x] 2.9 Expand admin user create/list/read/update APIs with profile fields while preserving role, status, duplicate email, and password-hash exclusion behavior.
- [x] 2.10 Ensure admin user update does not accept password changes, and admin user create/update does not accept avatar assignment or file upload; admin responses may expose `avatarAssetId`/`avatarUrl` as read-only metadata only.

## 3. Compatibility and Tests

- [x] 3.1 Add backend tests for `PATCH /me/profile`, protected-field rejection, unauthenticated rejection, and profile projection null handling.
- [x] 3.2 Add backend tests for `PATCH /me/password`: success, wrong current password, invalid new password, unauthenticated rejection, no token response, and no role/status/profile mutation.
- [x] 3.3 Add backend tests for avatar upload success, invalid upload rejection, unauthenticated upload/removal rejection, replacement cleanup, DB-failure cleanup, and avatar removal.
- [x] 3.4 Add admin user API tests for profile fields in create/list/read/update responses, read-only avatar metadata, rejected/ignored password update fields, and no `passwordHash`/token leakage.
- [x] 3.5 Add shared contract tests for profile fields, password change contracts, avatar responses, `Gender`, and `AssetKind.USER_AVATAR`.
- [x] 3.6 Add regression coverage that bulk check-in staff creation still uses the existing payload and creates accounts without profile/avatar data.
- [x] 3.7 Run the targeted database, backend identity, API contract, and staff-management test suites.
