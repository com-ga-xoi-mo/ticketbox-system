## Context

The backend change `expand-user-profile-avatar-account-management` added expanded user profile fields, current-user avatar endpoints, and current-user password change support. The frontend still has partial account experiences: audience `/account` is mostly read-only, admin `/admin/accounts` lacks the expanded profile fields, and the console top navbar uses a generated avatar with only logout.

The implementation touches both frontend apps: `apps/audience-web` for audience registration/account, and `apps/web` for admin/organizer console account management.

## Goals / Non-Goals

**Goals:**
- Provide editable audience account management for profile, avatar, and password.
- Expand admin account list/create/edit UI to include the new profile fields already supported by backend admin user APIs.
- Add admin/organizer self-account UI using only `/me/*` endpoints.
- Keep organizer account scope strictly self-profile management.
- Keep visual styling consistent with the current audience shadcn UI and console dark dashboard UI.

**Non-Goals:**
- No backend, database, or API contract changes.
- No admin avatar upload for other users.
- No changes to bulk check-in staff provisioning payload or UI.
- No role-specific profile tables or per-role frontend profile models.

## Decisions

- Use the backend source of truth from `/me/profile` for self-account UI and navbar identity. This avoids decoding display data from JWT and keeps avatar updates reflected after query invalidation.
- Add shared console hooks for `/me/profile`, `/me/avatar`, and `/me/password` in `apps/web`, then reuse them for both admin and organizer self-account screens. Admin user management stays on `/admin/users`.
- Keep admin account create/edit avatar read-only. The admin list can display `avatarUrl`, but dialogs will not upload another user's avatar because there is no backend API for that.
- Model profile form fields consistently across apps: `displayName`, `phone`, `dateOfBirth`, `gender`, `addressLine`, `city`, and `district`. Convert date input values to/from the API datetime string at the client boundary.
- Implement avatar upload with `FormData` field name `file`; accept image file selection in the UI and rely on backend validation for type and size while showing backend errors.
- Add missing audience-web API client helpers needed by this change: `apiPatch` for JSON PATCH requests and `apiPostFormData` for multipart uploads. Multipart helpers must omit the explicit `Content-Type` header so the browser sets the boundary.
- If the audience app has no registration route/page, add `/register`, link to it from `/login`, submit `POST /auth/register`, store the returned access token through the audience auth context, and redirect like the login flow.
- Treat console `Change Password` as navigation to the self-account page password section, not a separate modal. Use `/admin/account?section=password` for admins and `/organizer/account?section=password` for organizers.

## Risks / Trade-offs

- [Risk] Self-account UI duplicates form layout between audience and console. → Mitigation: share API behavior and keep UI components app-local to preserve each app's design system.
- [Risk] Navbar profile query could add extra loading work on every console page. → Mitigation: enable it only when authenticated and cache through React Query.
- [Risk] Date-of-birth timezone formatting can drift if displayed as a full datetime. → Mitigation: use date-only input presentation and convert to an ISO datetime at submit.
- [Risk] Admin account management may look inconsistent if many optional profile fields are empty. → Mitigation: render compact empty states and keep table columns focused on avatar, name, email, phone, roles, and status.
