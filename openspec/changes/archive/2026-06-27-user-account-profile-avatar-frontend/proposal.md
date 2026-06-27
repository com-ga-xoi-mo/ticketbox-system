## Why

The backend now supports expanded profile fields, avatar upload/removal, and authenticated password changes, but the frontend still exposes only partial account management. Users need a consistent UI to manage their own account, while admins need the expanded account fields in the existing management page.

## What Changes

- Add audience account management UI for profile editing, avatar upload/removal, and password changes on `/account`.
- Add an audience registration page/flow when missing, with optional phone capture.
- Update audience header dropdown to render the authenticated user's real avatar from `/me/profile`.
- Expand admin `/admin/accounts` to show and edit the new profile fields while preserving role/status management.
- Rename admin navigation from `Staff Accounts` to `Accounts`.
- Add console self-account management for ADMIN and ORGANIZER using `/me/profile`, `/me/avatar`, and `/me/password`.
- Add organizer route/sidebar item `/organizer/account`; organizer account management is strictly self-profile only.
- Update console top navbar avatar dropdown to show real profile data and expose Account, Change Password, and Logout actions.

## Capabilities

### New Capabilities
- `console-self-account-management`: Admin and organizer self-profile, avatar, and password management inside the console web app.

### Modified Capabilities
- `audience-account-profile`: Audience `/account` becomes an editable profile/avatar/password management page while retaining account navigation cards.
- `auth-registration`: Audience registration accepts optional phone and sends it to the existing registration API.
- `staff-management`: Admin account management UI displays and edits expanded user profile fields.
- `web-app-shell`: Console sidebar/top-navbar account navigation reflects the new account pages and real profile avatar data.

## Impact

- Affected apps: `apps/audience-web` and `apps/web`.
- Affected shared contracts/hooks: frontend usage of `@ticketbox/api-types` auth/profile schemas and `/me/*` endpoints.
- Audience registration flow includes route/link/API helper work because the current audience app only has login UI.
- No backend API, database, or storage behavior changes are included in this frontend change.
- Admin does not upload avatars for other users because the backend only supports current-user avatar management.
