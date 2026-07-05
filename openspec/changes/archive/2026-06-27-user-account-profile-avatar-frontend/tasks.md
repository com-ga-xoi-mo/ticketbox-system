## 1. Shared API and Form Foundations

- [x] 1.1 Add audience-web `apiPatch` and `apiPostFormData` helpers; `apiPostFormData` must omit explicit `Content-Type` and preserve auth headers.
- [x] 1.2 Update audience-web auth/profile API helpers to support `POST /auth/register`, `PATCH /me/profile`, `PATCH /me/password`, `POST /me/avatar` with `FormData.append('file', file)`, and `DELETE /me/avatar`.
- [x] 1.3 Add console-web `/me/*` API helpers and React Query hooks for profile fetch/update, password change, avatar upload, and avatar removal.
- [x] 1.4 Add shared frontend profile form value mapping for date input values and API datetime payloads in each app where needed.

## 2. Audience Web Account Experience

- [x] 2.1 Add audience `/register` route/page if missing, linked from `/login`.
- [x] 2.2 Add registration form fields for email, password, display name, and optional phone; submit `POST /auth/register`, store the returned token via auth context, and redirect like login.
- [x] 2.3 Replace the `/account` read-only profile section with editable profile fields for display name, phone, date of birth, gender, address line, city, and district.
- [x] 2.4 Add avatar display, upload/change, and remove controls on `/account`, using `/me/avatar` and refreshing `/me/profile` after success.
- [x] 2.5 Add current-password/new-password change form on `/account` using `PATCH /me/password`.
- [x] 2.6 Preserve existing account navigation cards for orders, tickets, support, notifications, and favorites.
- [x] 2.7 Update the audience header dropdown to render `profile.avatarUrl` when present and initials fallback when absent.

## 3. Admin Account Management

- [x] 3.1 Rename the admin sidebar label from `Staff Accounts` to `Accounts`.
- [x] 3.2 Extend admin account API types to include phone, date of birth, gender, address line, city, district, avatar asset id, and avatar URL.
- [x] 3.3 Update the `/admin/accounts` table to show avatar or initials, display name, email, phone, roles, and status.
- [x] 3.4 Extend account search to match phone values.
- [x] 3.5 Extend create-account dialog to submit optional profile fields supported by `POST /admin/users`.
- [x] 3.6 Extend edit-account dialog to edit supported profile fields while preserving role editing.
- [x] 3.7 Keep admin create/edit dialogs free of avatar upload/removal controls for other users.

## 4. Console Self-Account and Navbar

- [x] 4.1 Add reusable console self-account page UI for profile edit, avatar management, and password change using only `/me/*` hooks.
- [x] 4.2 Add `/admin/account` route for ADMIN self-account management.
- [x] 4.3 Add `/organizer/account` route and organizer sidebar `Account` item.
- [x] 4.4 Ensure organizer account page does not render user lists, role/status controls, or call `/admin/users`.
- [x] 4.5 Update console self-account page to activate or focus the password section when opened with `section=password`.
- [x] 4.6 Update console `TopNavbar` to load `/me/profile`, show avatar/display name/email, and provide Account, Change Password, and Logout actions.
- [x] 4.7 Route the navbar Account action to `/admin/account` or `/organizer/account`, and route Change Password to `/admin/account?section=password` or `/organizer/account?section=password`.

## 5. Tests and Verification

- [x] 5.1 Add or update audience-web tests for `/register`, registration phone payload behavior, profile update, avatar multipart field `file`, avatar removal, password change, and header avatar fallback.
- [x] 5.2 Add or update console-web tests for admin accounts list/create/edit expanded profile fields and phone search.
- [x] 5.3 Add or update console-web tests for organizer self-account route using only `/me/*` APIs.
- [x] 5.4 Add or update sidebar/router/navbar tests for `Accounts`, `/admin/account`, `/organizer/account`, and dropdown Account/Change Password/Logout behavior including `section=password` navigation.
- [x] 5.5 Run `npm run verify:audience-web`, `npm run verify:web`, and `openspec validate user-account-profile-avatar-frontend --strict`.
