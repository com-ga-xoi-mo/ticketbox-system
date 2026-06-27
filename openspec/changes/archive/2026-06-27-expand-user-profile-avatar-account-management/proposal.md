## Why

User accounts currently expose only basic identity fields, which limits profile workflows across all roles. This change adds the backend infrastructure for full profile editing, avatar support, and authenticated password changes: database schema, API contracts, backend use cases, controllers, and tests — while preserving existing auth, admin account, and bulk check-in staff provisioning behavior. Frontend integration is deferred to a separate change.

## What Changes

- Extend user profile data with nullable phone, date of birth, gender, address, city, district, and avatar asset fields.
- Add authenticated self-service profile update and avatar upload/removal APIs for the current user.
- Add authenticated self-service password change for all supported roles.
- Store avatars through the existing asset and object storage infrastructure, including cleanup of replaced or removed avatar objects.
- Expand admin user management APIs with profile fields in create, list, read, and update operations while retaining role and status management.
- Accept optional phone during audience self-registration.
- Keep bulk check-in staff creation payload unchanged, with regression coverage that nullable profile fields do not affect provisioning.
- Update shared API contracts (`@ticketbox/api-types`) with new profile fields as nullable/optional to maintain frontend compatibility.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `auth-registration`: Accept optional phone during audience self-registration while preserving AUDIENCE default role behavior.
- `identity-access`: Extend `GET /me/profile`, add self profile/avatar/password mutation behavior, and expand admin user projections/mutations with profile fields.
- `staff-management`: Preserve bulk check-in staff provisioning compatibility after the nullable user profile schema expansion.

## Impact

- Prisma schema and migration for `users`, `AssetKind`, and user-avatar asset relations.
- Backend identity profile/password/admin user DTOs, use cases, repositories, controllers, API contracts, and storage-backed avatar upload/removal flow.
- Shared API contract types (`@ticketbox/api-types`) updated with nullable/optional profile fields.
- Backend tests covering schema, profile APIs, password changes, avatar cleanup, admin account management, and unchanged bulk staff provisioning.
