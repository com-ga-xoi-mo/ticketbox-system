# Web App Shell

## Purpose
Define protected app-shell routing, role-filtered navigation, sidebar behavior, and top-navbar account actions for console web users.

## Requirements

### Requirement: Role-gated protected routes

The app shell SHALL protect authenticated routes so that an unauthenticated visitor is redirected to `/login`, and an authenticated user whose roles do not permit a route is sent to an access-denied page (NOT back to `/login`, to avoid a redirect loop). Admin web routes SHALL use the `/admin` prefix and organizer web routes SHALL use the `/organizer` prefix.

#### Scenario: Unauthenticated user redirected

- **WHEN** a visitor with no session navigates to a protected route
- **THEN** the app redirects them to `/login`

#### Scenario: Authenticated admin reaches permitted route

- **WHEN** an authenticated admin navigates to `/admin/dashboard`, `/admin/concerts`, `/admin/concerts/:id/edit`, `/admin/accounts`, or `/admin/assignments`
- **THEN** the route's page is rendered

#### Scenario: Authenticated organizer reaches permitted route

- **WHEN** an authenticated organizer navigates to `/organizer/concerts` or `/organizer/concerts/:id/edit`
- **THEN** the route's page is rendered

#### Scenario: Authenticated but unpermitted user sees access-denied

- **WHEN** an authenticated user whose roles do not include any role permitted for a route navigates to that route
- **THEN** the app shows an access-denied page offering sign-out
- **AND** the app does NOT redirect them to `/login`

### Requirement: Sidebar configuration filtered by role

The shell SHALL derive sidebar items from a single declarative `sidebar-config`, where each item lists the roles allowed to see it, and render only the items whose allowed roles include the current user's role. The admin account-management item SHALL be ADMIN-only, the organizer self-account item SHALL be ORGANIZER-only, and the assignment item SHALL be ADMIN-only. Sidebar item paths SHALL point to role-prefixed routes for admin and organizer destinations.

#### Scenario: Organizer sees only permitted items

- **WHEN** the current user's role is `ORGANIZER`
- **THEN** the sidebar shows organizer Dashboard, Concerts, Venue Maps, and Account
- **AND** the Account item links to `/organizer/account`
- **AND** the Concerts item links to `/organizer/concerts`
- **AND** the sidebar does NOT show admin Accounts or Assignments

#### Scenario: Admin sees admin-only items

- **WHEN** the current user's role is `ADMIN`
- **THEN** the sidebar shows Dashboard, Reports, Concerts, Venue Maps, Assignments, and Accounts
- **AND** the Dashboard item links to `/admin/dashboard`
- **AND** the Concerts item links to `/admin/concerts`
- **AND** the Accounts item links to `/admin/accounts`
- **AND** the Assignments item links to `/admin/assignments`

#### Scenario: Filter is data-driven

- **WHEN** a new item is added to `sidebar-config` with a `roles` list
- **THEN** it appears in the sidebar for exactly those roles without changes to the rendering component

### Requirement: Role redirect targets

The app shell SHALL redirect authenticated users from the root route to the first route for their active role. Admin SHALL take precedence when a session includes both ADMIN and ORGANIZER roles.

#### Scenario: Admin root redirect

- **WHEN** an authenticated admin opens `/`
- **THEN** the app redirects them to `/admin/dashboard`

#### Scenario: Organizer root redirect

- **WHEN** an authenticated organizer opens `/`
- **THEN** the app redirects them to `/organizer/concerts`

#### Scenario: Admin precedence

- **WHEN** an authenticated session includes both `ADMIN` and `ORGANIZER`
- **THEN** the app redirects to `/admin/dashboard`

### Requirement: Collapsible sidebar layout

The shell SHALL render a collapsible sidebar (expandable label mode and collapsed icon-only mode) alongside a content area that hosts the active feature page.

#### Scenario: Sidebar collapses to icons

- **WHEN** the user toggles the sidebar to collapsed mode
- **THEN** the sidebar shows icons only and the content area expands to fill the freed space

#### Scenario: Active item highlighted

- **WHEN** a feature page is active
- **THEN** its corresponding sidebar item is visually marked as active

### Requirement: Console top navbar uses profile identity
The console top navbar SHALL render the authenticated user's display name, email, and avatar from current profile data fetched through `GET /me/profile`.

#### Scenario: Console profile has avatar URL
- **WHEN** the authenticated console user's profile includes `avatarUrl`
- **THEN** the top navbar displays that avatar image

#### Scenario: Console profile has no avatar URL
- **WHEN** the authenticated console user's profile has no avatar URL
- **THEN** the top navbar displays fallback initials derived from the user's display name or email

### Requirement: Console avatar dropdown exposes account actions
The console avatar dropdown SHALL expose account actions for the current user's role: Account, Change Password, and Logout.

#### Scenario: Admin uses account dropdown
- **WHEN** an authenticated ADMIN user opens the avatar dropdown
- **THEN** the Account action links to `/admin/account`
- **AND** the Change Password action links to `/admin/account?section=password`

#### Scenario: Organizer uses account dropdown
- **WHEN** an authenticated ORGANIZER user opens the avatar dropdown
- **THEN** the Account action links to `/organizer/account`
- **AND** the Change Password action links to `/organizer/account?section=password`
