## MODIFIED Requirements

### Requirement: Concert list surface

The web app SHALL provide role-prefixed concert list routes inside the protected `ShellLayout`. Organizers SHALL use `/organizer/concerts` and see their own concerts fetched from `GET /organizer/concerts`; admins SHALL use `/admin/concerts` and see all concerts fetched from `GET /admin/concerts`. The list SHALL render real API data only and SHALL NOT use mock data.

#### Scenario: Organizer views their concert list

- **WHEN** an authenticated organizer navigates to `/organizer/concerts`
- **THEN** the page SHALL fetch and display the organizer's concerts (title, artist, venue/city, schedule, status) from the backend
- **AND** the organizer concert page SHALL expose the create-concert action

#### Scenario: Admin views all concerts

- **WHEN** an authenticated admin navigates to `/admin/concerts`
- **THEN** the page SHALL fetch and display all concerts from the admin backend endpoint
- **AND** the admin concert page SHALL NOT expose the create-concert action

#### Scenario: Empty state when no concerts exist

- **WHEN** the organizer or admin has no visible concerts
- **THEN** organizers SHALL see the empty-state design with a primary "Create Concert" action, while admins SHALL see a moderation empty state without a create action

#### Scenario: Loading and error states

- **WHEN** the concert list request is pending or fails
- **THEN** the page SHALL show a loading indicator while pending and an error message on failure, without crashing

#### Scenario: Status filtering

- **WHEN** the organizer or admin selects a status filter tab (All, Published, Draft, Cancelled, Ended)
- **THEN** the visible rows SHALL be limited to concerts matching the selected status

### Requirement: Concert detail panel and edit route

The web app SHALL present concert detail in a shared panel beside the role-specific concert list when a concert is selected, showing its event information (venue, city, schedule), current status, and a setup/inventory summary. Editing metadata SHALL open the role-specific edit route: `/organizer/concerts/:id/edit` for organizers and `/admin/concerts/:id/edit` for admins. Both roles SHALL use the same shared detail panel component. Ticket-type and seating-map editor surfaces are out of scope for this change and SHALL NOT be rendered.

#### Scenario: Selecting a concert opens the detail panel

- **WHEN** the organizer or admin selects a concert from their role-specific list
- **THEN** the app SHALL show that concert's detail panel beside the list with its event info (venue, city, schedule), current status, and setup/inventory summary
- **AND** the panel SHALL offer an Edit action, a Publish action when the concert is DRAFT, and a Cancel action when the concert is not already ENDED or CANCELLED

#### Scenario: Organizer editing a concert opens the organizer edit route

- **WHEN** an organizer activates Edit from the detail panel
- **THEN** the app SHALL navigate to `/organizer/concerts/:id/edit` and render the editable metadata form
- **AND** the page label SHALL identify "Organizer -- Editing Concert"

#### Scenario: Admin editing a concert opens the admin edit route

- **WHEN** an admin activates Edit from the detail panel
- **THEN** the app SHALL navigate to `/admin/concerts/:id/edit` and render the editable metadata form
- **AND** the page label SHALL identify "Admin -- Editing Concert"

#### Scenario: Admin cannot create concerts

- **WHEN** an admin views the concert list or a concert's detail panel
- **THEN** the UI SHALL NOT render a create-concert action

#### Scenario: Ticket type and seating map editors are deferred

- **WHEN** viewing a concert's detail panel or edit route
- **THEN** the UI SHALL NOT render ticket-type or seating-map editor surfaces (deferred to separate changes)

### Requirement: Concert create and edit

The web app SHALL provide forms to create and edit a concert with fields slug, title, artistName, venueName, venueAddress, city, startsAt, endsAt, and description, validated before submission. Slug SHALL be editable. Concert creation SHALL be organizer-only from `/organizer/concerts`. Concert editing SHALL be available to organizers from `/organizer/concerts/:id/edit` and admins from `/admin/concerts/:id/edit`, submitted through their respective role-appropriate endpoints (`/organizer/concerts/:id` or `/admin/concerts/:id`).

#### Scenario: Valid create submission

- **WHEN** the organizer submits the create form with all required fields valid
- **THEN** the app SHALL POST to the organizer concerts endpoint and refresh the organizer concert list on success
- **AND** this action SHALL NOT be available to admin users

#### Scenario: Invalid form is rejected client-side

- **WHEN** required fields are missing, the slug is not URL-safe, or endsAt is not after startsAt
- **THEN** the form SHALL surface field-level validation errors and SHALL NOT submit

#### Scenario: Organizer edit submission

- **WHEN** the organizer saves edits, including a changed slug, to an existing concert
- **THEN** the app SHALL PATCH `/organizer/concerts/:id` and refresh the affected organizer concert data on success

#### Scenario: Admin edit submission

- **WHEN** the admin saves edits, including a changed slug, to an existing concert
- **THEN** the app SHALL PATCH `/admin/concerts/:id` and refresh the affected admin concert data on success

### Requirement: Role-aware shell navigation

The web app SHALL expose only the global sidebar items that belong to the active role. Organizer sidebar SHALL contain Concerts and Settings, with Concerts linking to `/organizer/concerts`. Admin sidebar SHALL contain Dashboard, Concerts, Staff, and Settings, with Dashboard linking to `/admin/dashboard` and Concerts linking to `/admin/concerts`. Seating Map SHALL NOT appear as a global sidebar item.

#### Scenario: Organizer lands on concerts

- **WHEN** an authenticated organizer opens the root route
- **THEN** the app SHALL redirect them to `/organizer/concerts`

#### Scenario: Admin lands on dashboard

- **WHEN** an authenticated admin opens the root route
- **THEN** the app SHALL redirect them to `/admin/dashboard`

### Requirement: Concert query cache keys

The web app SHALL use stable, namespaced TanStack Query keys for the concert list and concert detail so that mutations can invalidate the correct cached data without reusing admin data for organizer sessions or one organizer's data for another organizer. Admin and organizer concert feature folders SHALL have independent key namespaces, and shared concert key helpers SHALL NOT require or include a `role` field.

#### Scenario: List and detail keys are distinct and stable

- **WHEN** building query keys for the concert list and for a concert by id
- **THEN** the list key and the detail-by-id key SHALL be deterministic and distinguishable
- **AND** the detail key SHALL incorporate the concert id
- **AND** the shared query key helper SHALL NOT require a role value

#### Scenario: Role feature keys are isolated

- **WHEN** admin and organizer concert hooks build list or detail query keys
- **THEN** the keys SHALL use separate role-feature namespaces
- **AND** organizer keys SHALL include the authenticated session identity when needed to prevent cross-organizer cache reuse
