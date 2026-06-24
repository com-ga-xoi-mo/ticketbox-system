## Context

`apps/web/src/features/concerts` currently serves both admin and organizer users. Role-specific behavior is selected at runtime through `useConcertSession()`, which derives `role`, `basePath`, and cache scope, and page components branch on `isAdmin` for actions, copy, and edit labels. Backend endpoints and data scoping are already separated (`/admin/concerts` and `/organizer/concerts`), so this change is a frontend structure and route-path refactor.

The existing shared pieces are valuable and should remain single-sourced when they are role-neutral: concert table/detail presentation, empty/filter components, status mapping, form validation/payload helpers, API client, auth context, protected routes, shell layout, sidebar, and navbar. Components that currently import concert mutation hooks are not role-neutral until those hook calls are moved out to role feature pages.

## Goals / Non-Goals

**Goals:**

- Give admin and organizer concert management separate frontend feature folders and route paths.
- Remove scattered runtime role branching from concert pages and hooks.
- Preserve one shared copy of heavy or role-neutral concert components and helpers without allowing `concerts-shared` to import from `features/admin/*` or `features/organizer/*`.
- Keep backend endpoints, request payloads, lifecycle behavior, and auth contracts unchanged.
- Move the admin dashboard into the admin feature namespace.
- Update tests and specs so route, redirect, sidebar, and query key expectations match the role-prefixed paths.

**Non-Goals:**

- Splitting the Vite app, Tailwind config, router, shared shell, shared UI primitives, or auth layer.
- Creating duplicate copies of shared concert components or types.
- Changing backend APIs, authorization, data scoping, concert lifecycle rules, or dashboard behavior.
- Adding new business features.

## Decisions

1. Use three concert-related frontend folders:
   - `features/concerts-shared/` for role-neutral components and helpers that do not import role feature hooks.
   - `features/admin/concerts/` for admin pages, hooks, and API constants.
   - `features/organizer/concerts/` for organizer pages, hooks, and API constants.

   Rationale: this keeps role workflows readable without duplicating the expensive UI pieces. The main alternative was to keep `features/concerts` and introduce more helper functions, but that would leave the feature mentally shared and continue encouraging role checks in pages.

2. Make each role feature own a fixed base path constant.
   - Admin uses `/admin/concerts`.
   - Organizer uses `/organizer/concerts`.

   Rationale: route prefix, backend base URL, and feature folder all line up, and hooks no longer need `useConcertSession()`. The alternative was a generic hook factory that accepts `role`, but that keeps role selection as an implementation concern in the feature.

3. Keep shared query-key helper shape role-free and namespace keys per role feature.

   Rationale: once admin and organizer hooks live in separate folders, key isolation can come from feature-specific namespaces plus session identity where needed. This removes the shared `{ role, sub }` scope while still preventing cross-session reuse. The alternative was to retain a shared `role` field in keys, which contradicts the split and keeps role plumbing in shared code.

4. Make shared concert components receive role operations through props instead of importing role hooks.

   `ConcertDetailPanel` can remain in `concerts-shared/components/` only after `usePublishConcertMutation()` and `useCancelConcertMutation()` are removed from it. The admin and organizer `ConcertsPage` implementations will call their own role-specific hooks and pass callbacks such as `onPublish`, `onCancel`, `isPublishing`, and `isCancelling` into the shared panel. This keeps `concerts-shared` independent from role folders and prevents admin pages from accidentally using organizer endpoints.

   `ConcertFormModal` currently calls create/update mutation hooks. Because admins cannot create concerts, the create modal should live in `features/organizer/concerts/` unless implementation first splits it into a hook-free shared form component plus an organizer-owned modal wrapper. The preferred implementation for this change is to move the modal wrapper to organizer and keep only validation/payload helpers in `concerts-shared`.

   Rationale: callback injection keeps shared components presentational and role-agnostic. The alternative was importing one role's hooks from shared code or building a generic hook registry, but both preserve hidden role coupling.

5. Keep `ShellLayout`, `Sidebar`, `TopNavbar`, and hook-free `ConcertDetailPanel` presentation shared.

   Rationale: these are layout or role-neutral presentation surfaces. `Sidebar` already reads the current role to filter declarative config and can continue doing so with updated paths. Duplicating the shell or detail panel would increase maintenance cost without changing behavior.

6. Use role-prefixed protected routes.
   - `/admin/dashboard`, `/admin/concerts`, `/admin/concerts/:id/edit` are ADMIN-only.
   - `/organizer/concerts`, `/organizer/concerts/:id/edit` are ORGANIZER-only.

   Rationale: frontend route ownership matches backend scope and folder ownership. The alternative was to keep `/concerts` and split internals only, but that would preserve an ambiguous route and require runtime role selection at navigation boundaries.

## Risks / Trade-offs

- Route migration can leave stale internal links to `/concerts` or `/dashboard` -> mitigate with `rg` for hard-coded paths and update `role-access`, sidebar config, edit links, discard/back navigation, and tests.
- Moving files can break relative imports -> mitigate by updating imports in one pass and running `npm --workspace @ticketbox/web run verify`.
- Shared components can accidentally retain imports from role hooks -> mitigate by checking that `features/concerts-shared` imports only shared modules, shared UI/API/auth as needed, and external packages, never `features/admin/*` or `features/organizer/*`.
- Cache key changes can accidentally share organizer data across users -> mitigate by keeping session identity in role feature keys where user-specific data is cached, even though the shared key helper no longer has a `role` field.
- Spec wording may overlap between `web-concert-management` and `web-app-shell` -> keep concert specs focused on concert surfaces and shell specs focused on route guards, redirects, and sidebar navigation.

## Migration Plan

1. Move hook-free shared concert components/helpers/spec tests into `features/concerts-shared/`.
2. Refactor `ConcertDetailPanel` to accept publish/cancel callbacks and pending state through props before moving it to shared.
3. Move organizer-only `ConcertFormModal` into `features/organizer/concerts/`, or split out a hook-free shared form component if reuse is needed later.
4. Create admin and organizer concert feature folders with role-specific pages, hooks, API wrappers, and tests.
5. Move dashboard files into `features/admin/dashboard/`.
6. Update router imports and route definitions to the new protected paths.
7. Update role redirects, sidebar config paths, internal `Link`/`navigate` calls, and associated tests.
8. Run `npm --workspace @ticketbox/web run verify`.
9. Smoke check admin and organizer sessions against `/admin/concerts` and `/organizer/concerts`.

Rollback is a frontend-only revert of these file moves and route/config changes; no backend or data migration is involved.

## Open Questions

- None.
