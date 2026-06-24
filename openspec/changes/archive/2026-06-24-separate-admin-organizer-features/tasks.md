## 1. Shared Concert Extraction

- [x] 1.1 Create `apps/web/src/features/concerts-shared/` and move role-neutral types, status helpers, form helpers, query key helpers, and hook-free shared concert components into it.
- [x] 1.2 Move `status.spec.ts`, `concert-form.spec.ts`, and `query-keys.spec.ts` to the shared concert folder and update their imports and expectations.
- [x] 1.3 Refactor `ConcertDetailPanel` so it no longer imports concert mutation hooks and instead receives `onPublish`, `onCancel`, `isPublishing`, and `isCancelling` through props.
- [x] 1.4 Update shared concert components to import helpers and UI primitives from their new relative locations without changing component behavior.
- [x] 1.5 Verify `apps/web/src/features/concerts-shared/` does not import from `features/admin/*` or `features/organizer/*`.

## 2. Admin Concert Feature

- [x] 2.1 Create `apps/web/src/features/admin/concerts/` with admin `api.ts`, `hooks.ts`, `ConcertsPage.tsx`, and `ConcertEditPage.tsx`.
- [x] 2.2 Set the admin concert API base path to `/admin/concerts` and remove `useConcertSession()` and role-derived base-path logic from admin hooks.
- [x] 2.3 Update the admin concert list page so it has no create action, uses the admin moderation description, and passes `canCreate=false` to the empty state.
- [x] 2.4 Call admin publish/cancel hooks in the admin concert page and inject their handlers and pending state into the shared `ConcertDetailPanel`.
- [x] 2.5 Update the admin edit page navigation and copy so back/discard/success paths return to `/admin/concerts` and the header label is `Admin -- Editing Concert`.
- [x] 2.6 Add or move admin concert API/hook tests so list, detail, update, publish, and cancel calls use the admin endpoints.

## 3. Organizer Concert Feature

- [x] 3.1 Create `apps/web/src/features/organizer/concerts/` with organizer `api.ts`, `hooks.ts`, `ConcertsPage.tsx`, and `ConcertEditPage.tsx`.
- [x] 3.2 Set the organizer concert API base path to `/organizer/concerts` and remove role-derived base-path logic from organizer hooks.
- [x] 3.3 Keep organizer query keys scoped by `session.sub` so cached organizer concert data cannot leak between organizer sessions.
- [x] 3.4 Move the create modal wrapper into `features/organizer/concerts/`, or split it into an organizer-owned wrapper around hook-free shared form pieces.
- [x] 3.5 Preserve organizer create, edit, publish, and cancel flows, including create modal behavior and list invalidation after mutations.
- [x] 3.6 Call organizer publish/cancel hooks in the organizer concert page and inject their handlers and pending state into the shared `ConcertDetailPanel`.
- [x] 3.7 Update organizer edit page navigation and copy so back/discard/success paths return to `/organizer/concerts` and the header label is `Organizer -- Editing Concert`.
- [x] 3.8 Add or move organizer concert API/hook tests so create, list, detail, update, publish, and cancel calls use the organizer endpoints.

## 4. Admin Dashboard and Routing

- [x] 4.1 Move `apps/web/src/features/dashboard/` into `apps/web/src/features/admin/dashboard/` and update dashboard imports.
- [x] 4.2 Update `apps/web/src/app/router.tsx` to import role-specific concert and dashboard pages from their new folders.
- [x] 4.3 Define ADMIN-protected routes for `/admin/dashboard`, `/admin/concerts`, and `/admin/concerts/:id/edit`.
- [x] 4.4 Define ORGANIZER-protected routes for `/organizer/concerts` and `/organizer/concerts/:id/edit`.
- [x] 4.5 Update any wildcard or root redirect behavior so legacy shared paths are not the primary navigation targets.

## 5. Navigation and Access Config

- [x] 5.1 Update `redirectFor()` so ADMIN redirects to `/admin/dashboard` and ORGANIZER redirects to `/organizer/concerts`, preserving ADMIN precedence.
- [x] 5.2 Update `sidebar-config.ts` so admin sidebar paths point to `/admin/dashboard` and `/admin/concerts`, while organizer Concerts points to `/organizer/concerts`.
- [x] 5.3 Search `apps/web/src` for hard-coded `/concerts`, `/dashboard`, `to="/concerts"`, and `navigate('/concerts')` references and update them to role-specific paths.
- [x] 5.4 Keep `ShellLayout`, `Sidebar`, `TopNavbar`, shared UI primitives, shared auth, and shared API client single-sourced.

## 6. Verification

- [x] 6.1 Update role redirect and sidebar tests to expect the new role-prefixed paths.
- [x] 6.2 Run `npm --workspace @ticketbox/web run verify` and fix any typecheck or test failures.
- [x] 6.3 Run the web dev server and smoke check ADMIN at `/admin/concerts` for all concerts with no Create button.
- [x] 6.4 Smoke check ORGANIZER at `/organizer/concerts` for own concerts with Create, Publish, and Cancel flows available.
