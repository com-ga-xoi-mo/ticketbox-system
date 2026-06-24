## MODIFIED Requirements

### Requirement: Role-gated protected routes

The app shell SHALL protect authenticated routes so that an unauthenticated visitor is redirected to `/login`, and an authenticated user whose roles do not permit a route is sent to an access-denied page (NOT back to `/login`, to avoid a redirect loop). Admin web routes SHALL use the `/admin` prefix and organizer web routes SHALL use the `/organizer` prefix.

#### Scenario: Unauthenticated user redirected

- **WHEN** a visitor with no session navigates to a protected route
- **THEN** the app redirects them to `/login`

#### Scenario: Authenticated admin reaches permitted route

- **WHEN** an authenticated admin navigates to `/admin/dashboard`, `/admin/concerts`, `/admin/concerts/:id/edit`, `/admin/venue-maps`, or `/admin/venue-maps/:id`
- **THEN** the route's page is rendered

#### Scenario: Authenticated organizer reaches permitted route

- **WHEN** an authenticated organizer navigates to `/organizer/concerts`, `/organizer/concerts/:id/edit`, `/organizer/venue-maps`, or `/organizer/venue-maps/:id`
- **THEN** the route's page is rendered

#### Scenario: Authenticated but unpermitted user sees access-denied

- **WHEN** an authenticated user whose roles do not include any role permitted for a route navigates to that route
- **THEN** the app shows an access-denied page offering sign-out
- **AND** the app does NOT redirect them to `/login`

### Requirement: Sidebar configuration filtered by role

The shell SHALL derive sidebar items from a single declarative `sidebar-config`, where each item lists the roles allowed to see it, and render only the items whose allowed roles include the current user's role. The Staff item is ADMIN-only and MUST be hidden from organizers. Sidebar item paths SHALL point to role-prefixed routes for admin and organizer destinations, including Venue Maps routes.

#### Scenario: Organizer sees only permitted items

- **WHEN** the current user's role is `ORGANIZER`
- **THEN** the sidebar shows Concerts, Venue Maps, and Settings
- **AND** the Concerts item links to `/organizer/concerts`
- **AND** the Venue Maps item links to `/organizer/venue-maps`
- **AND** the sidebar does NOT show Dashboard or Staff

#### Scenario: Admin sees admin-only items

- **WHEN** the current user's role is `ADMIN`
- **THEN** the sidebar shows Dashboard, Concerts, Venue Maps, Staff, and Settings
- **AND** the Dashboard item links to `/admin/dashboard`
- **AND** the Concerts item links to `/admin/concerts`
- **AND** the Venue Maps item links to `/admin/venue-maps`

#### Scenario: Filter is data-driven

- **WHEN** a new item is added to `sidebar-config` with a `roles` list
- **THEN** it appears in the sidebar for exactly those roles without changes to the rendering component
