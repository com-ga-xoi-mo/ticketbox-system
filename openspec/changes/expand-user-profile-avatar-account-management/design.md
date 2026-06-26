## Context

The identity module currently supports registration, login, `GET /me/profile`, admin user management under `/admin/users`, and bulk check-in staff provisioning. User persistence only stores `email`, `passwordHash`, `displayName`, `status`, timestamps, and role relations.

The platform already has a reusable `assets` table, `ObjectStoragePort`, local/S3 storage adapters, and `GET /assets/:id`. Concert poster upload demonstrates the desired lifecycle: upload a new object, write asset metadata and association, clean up the new object on DB failure, and delete the replaced object after a successful association.

Frontend integration (audience account UI, organizer self-account page, admin account management UI) is deferred to a separate change and is not in scope here.

## Goals / Non-Goals

**Goals:**
- Store nullable profile fields directly on `users`: phone, date of birth, gender, address line, city, district, and avatar asset reference.
- Reuse `assets` and `ObjectStoragePort` for user avatars with cleanup of replaced and removed avatar objects.
- Expand `/me/profile` and admin user APIs to return and mutate the new profile fields safely.
- Add authenticated current-user password change for all supported roles.
- Preserve existing bulk check-in staff provisioning without payload changes.

**Non-Goals:**
- No role-specific profile tables.
- No unique phone constraint.
- No raw avatar URL stored on `users`.
- No admin upload or assignment of avatars on behalf of another user in this change; avatar mutation is current-user only through `/me/avatar`.
- No organizer access to lists or management actions for other user accounts.
- No forgot-password, password reset email, password history, forced logout, or admin password reset workflow.

## Decisions

### Store profile fields on `users`

Add nullable columns to `users` instead of introducing profile tables. The fields are shared across audience, organizer, staff, and admin accounts, and nullable columns avoid breaking existing rows and bulk staff creation.

Alternatives considered:
- Separate `user_profiles` table: more flexible but unnecessary for this first shared profile set.
- Per-role profile tables: stronger modeling but adds complexity before roles have divergent profile requirements.

### Represent avatar as an asset relation

Add `AssetKind.USER_AVATAR` and `users.avatar_asset_id` referencing `assets.id`. API responses may include `avatarAssetId` and a resolved `avatarUrl`, but persistence stores only the asset relation.

Alternatives considered:
- Store avatar URL on `users`: simpler reads but bypasses existing asset lifecycle and makes cleanup harder.
- Store image bytes in `users`: rejected because storage already exists and DB rows should not hold binary avatars.

### Avatar replacement follows poster cleanup semantics

`POST /me/avatar` uploads the new object first, then creates asset metadata and updates the user in a transaction. If the DB write fails, the newly uploaded object is deleted. If the DB write succeeds, any previous avatar object's storage key is deleted. `DELETE /me/avatar` clears `avatarAssetId` and deletes the current object.

This matches existing poster replacement behavior and prevents long-term storage leaks without risking loss of the current avatar before the replacement is committed.

The persistence boundary should expose a single repository operation for avatar replacement/removal, such as creating the `USER_AVATAR` asset, updating `users.avatar_asset_id`, and returning the replaced asset's `storageKey` from the same transaction. Storage deletion remains outside the DB transaction and only runs after the transaction outcome is known.

### Self-profile updates are narrowly scoped

`PATCH /me/profile` only accepts editable profile fields: `displayName`, `phone`, `dateOfBirth`, `gender`, `addressLine`, `city`, and `district`. It must ignore or reject roles, status, email, password, and password hash changes.

Admin user APIs can create and update the same profile fields while retaining existing role/status rules. Admin email updates remain governed by the current duplicate email behavior.

Admin user create/update endpoints do not accept `avatarAssetId` or avatar file payloads in this change. Admin list/read responses include `avatarAssetId` and `avatarUrl` for display, but avatar ownership changes are only performed by the authenticated user through `/me/avatar`.

Admin user update endpoints also do not accept password changes in this change. Admin-created users still receive an initial `passwordRaw` only at creation time; subsequent password changes are current-user only through `/me/password`.

### Current-user password change verifies the existing password

`PATCH /me/password` accepts `currentPassword` and `newPassword` for any authenticated `AUDIENCE`, `ORGANIZER`, `CHECKIN_STAFF`, or `ADMIN` user. The use case loads the authenticated user's current password hash, verifies `currentPassword` through the existing `PasswordHasherPort.compare`, validates `newPassword` with the same user-facing minimum length as registration (8 characters), hashes it, and persists the new hash.

The endpoint returns a success response without exposing password hashes or issuing a new token. Existing JWTs remain valid because the current auth model has no server-side token revocation; forcing re-login belongs in a separate session-management change.

### Gender is a Prisma enum with three values

`gender` on `users` is a Prisma enum: `MALE | FEMALE | OTHER`. API contracts expose it as a string union of the same values, nullable. There is no free-text gender field.

### Phone validation: null or fully valid, never partial

`phone` is either `null` (absent/cleared) or a fully valid phone number string (7–15 digits, optionally prefixed with `+`, matching E.164 conventions). Partial or malformed phone strings are rejected at the DTO validation layer with a 400 error. The database applies no unique constraint on phone.

`PATCH /me/profile` with `phone: null` explicitly clears the stored phone. Omitting the `phone` key entirely leaves the existing value unchanged (standard merge-patch semantics apply to all editable profile fields).

### avatarUrl is the asset's publicUrl, computed at upload time

`avatarUrl` in API responses is the `publicUrl` field of the linked asset row. It is computed once at upload time via `storage.getPublicUrl(storageKey)` — identical to how poster and seating-map public URLs are produced — and stored in `assets.publicUrl`. The profile response joins with `assets` to include `avatarUrl = asset.publicUrl`. No URL is constructed at read time.

### dateOfBirth is stored as Prisma DateTime

`dateOfBirth` is a nullable `DateTime` column in Prisma. API responses serialize it as an ISO 8601 string. Clients should submit it as a UTC midnight ISO 8601 datetime string (e.g., `2000-01-15T00:00:00.000Z`). No time-of-day semantics are applied; only the date portion is meaningful.

### Bulk staff provisioning remains minimal

Bulk create staff continues to accept only base email, quantity, and display name prefix. Because new user columns are nullable, `PrismaBulkCheckinStaffProvisioningRepository` can keep creating users without profile/avatar values. Regression tests should prove the flow still creates users, assignments, and credentials.

## Risks / Trade-offs

- Avatar replacement could leave orphaned asset rows if storage deletion fails after DB success -> Log or tolerate delete failures like existing poster cleanup; the user-facing profile remains correct.
- New nullable profile fields can lead to inconsistent formatting -> Apply DTO validation and trimming at API boundaries; keep DB constraints lightweight.
- Returning both `avatarAssetId` and `avatarUrl` can create ambiguity -> Treat `avatarAssetId` as the canonical reference; `avatarUrl` is derived for client convenience.
- Expanding admin account DTOs increases blast radius for account management -> Keep tests focused on safe projection, duplicate email behavior, role/status preservation, and password hash exclusion.

## Migration Plan

1. Add the nullable Prisma fields, `USER_AVATAR` enum value, user-avatar relation, and migration.
2. Update shared API contracts (`@ticketbox/api-types`) with new profile fields as nullable/optional to maintain frontend compatibility.
3. Update backend profile/admin projections to tolerate null values.
4. Implement self profile update and avatar upload/removal use cases using existing object storage.
5. Expand admin user APIs with profile fields.
6. Add regression coverage for bulk staff provisioning.

Rollback is straightforward for application code. Database rollback would require dropping the nullable profile columns, `avatar_asset_id` foreign key, and `USER_AVATAR` enum value only if no production avatar assets depend on it.
