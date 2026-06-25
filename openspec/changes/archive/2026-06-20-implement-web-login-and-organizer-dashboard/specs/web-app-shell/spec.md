## ADDED Requirements

### Requirement: Role-gated protected routes

The app shell SHALL protect authenticated routes so that an unauthenticated visitor is redirected to `/login`, and an authenticated user whose roles do not permit a route is sent to an access-denied page (NOT back to `/login`, to avoid a redirect loop).

#### Scenario: Unauthenticated user redirected

- **WHEN** a visitor with no session navigates to a protected route
- **THEN** the app redirects them to `/login`

#### Scenario: Authenticated user reaches permitted route

- **WHEN** a user whose role permits the route navigates to it
- **THEN** the route's page is rendered

#### Scenario: Authenticated but unpermitted user sees access-denied

- **WHEN** an authenticated user whose roles do not include any role permitted for the route navigates to it
- **THEN** the app shows an access-denied page offering sign-out
- **AND** the app does NOT redirect them to `/login`

### Requirement: Sidebar configuration filtered by role

The shell SHALL derive sidebar items from a single declarative `sidebar-config`, where each item lists the roles allowed to see it, and render only the items whose allowed roles include the current user's role. The Staff item is ADMIN-only and MUST be hidden from organizers.

#### Scenario: Organizer sees only permitted items

- **WHEN** the current user's role is `ORGANIZER`
- **THEN** the sidebar shows Dashboard, Concerts, Seating Maps, and Settings
- **AND** the sidebar does NOT show Staff

#### Scenario: Admin sees admin-only items

- **WHEN** the current user's role is `ADMIN`
- **THEN** the sidebar additionally shows Staff

#### Scenario: Filter is data-driven

- **WHEN** a new item is added to `sidebar-config` with a `roles` list
- **THEN** it appears in the sidebar for exactly those roles without changes to the rendering component

### Requirement: Collapsible sidebar layout

The shell SHALL render a collapsible sidebar (expandable label mode and collapsed icon-only mode) alongside a content area that hosts the active feature page.

#### Scenario: Sidebar collapses to icons

- **WHEN** the user toggles the sidebar to collapsed mode
- **THEN** the sidebar shows icons only and the content area expands to fill the freed space

#### Scenario: Active item highlighted

- **WHEN** a feature page is active
- **THEN** its corresponding sidebar item is visually marked as active
