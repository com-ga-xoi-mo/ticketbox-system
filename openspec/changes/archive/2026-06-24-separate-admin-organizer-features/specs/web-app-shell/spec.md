## MODIFIED Requirements

### Requirement: Role-gated protected routes

The app shell SHALL protect authenticated routes so that an unauthenticated visitor is redirected to `/login`, and an authenticated user whose roles do not permit a route is sent to an access-denied page (NOT back to `/login`, to avoid a redirect loop). Admin web routes SHALL use the `/admin` prefix and organizer web routes SHALL use the `/organizer` prefix.

#### Scenario: Unauthenticated user redirected

- **WHEN** a visitor with no session navigates to a protected route
- **THEN** the app redirects them to `/login`

#### Scenario: Authenticated admin reaches permitted route

- **WHEN** an authenticated admin navigates to `/admin/dashboard`, `/admin/concerts`, or `/admin/concerts/:id/edit`
- **THEN** the route's page is rendered

#### Scenario: Authenticated organizer reaches permitted route

- **WHEN** an authenticated organizer navigates to `/organizer/concerts` or `/organizer/concerts/:id/edit`
- **THEN** the route's page is rendered

#### Scenario: Authenticated but unpermitted user sees access-denied

- **WHEN** an authenticated user whose roles do not include any role permitted for a route navigates to that route
- **THEN** the app shows an access-denied page offering sign-out
- **AND** the app does NOT redirect them to `/login`

### Requirement: Sidebar configuration filtered by role

The shell SHALL derive sidebar items from a single declarative `sidebar-config`, where each item lists the roles allowed to see it, and render only the items whose allowed roles include the current user's role. The Staff item is ADMIN-only and MUST be hidden from organizers. Sidebar item paths SHALL point to role-prefixed routes for admin and organizer destinations.

#### Scenario: Organizer sees only permitted items

- **WHEN** the current user's role is `ORGANIZER`
- **THEN** the sidebar shows Concerts and Settings
- **AND** the Concerts item links to `/organizer/concerts`
- **AND** the sidebar does NOT show Dashboard, Staff, or Seating Maps

#### Scenario: Admin sees admin-only items

- **WHEN** the current user's role is `ADMIN`
- **THEN** the sidebar shows Dashboard, Concerts, Staff, and Settings
- **AND** the Dashboard item links to `/admin/dashboard`
- **AND** the Concerts item links to `/admin/concerts`

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
