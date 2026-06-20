# web-concert-management Specification

## Purpose
TBD

## Requirements

### Requirement: Concert list surface

The web app SHALL provide a `/concerts` route inside the protected `ShellLayout` for organizers and admins. Organizers SHALL see their own concerts fetched from `GET /organizer/concerts`; admins SHALL see all concerts fetched from `GET /admin/concerts`. The list SHALL render real API data only and SHALL NOT use mock data.

#### Scenario: Organizer views their concert list

- **WHEN** an authenticated organizer navigates to `/concerts`
- **THEN** the page SHALL fetch and display the organizer's concerts (title, artist, venue/city, schedule, status) from the backend

#### Scenario: Admin views all concerts

- **WHEN** an authenticated admin navigates to `/concerts`
- **THEN** the page SHALL fetch and display all concerts from the admin backend endpoint

#### Scenario: Empty state when no concerts exist

- **WHEN** the organizer or admin has no visible concerts
- **THEN** organizers SHALL see the empty-state design with a primary "Create Concert" action, while admins SHALL see a moderation empty state without a create action

#### Scenario: Loading and error states

- **WHEN** the concert list request is pending or fails
- **THEN** the page SHALL show a loading indicator while pending and an error message on failure, without crashing

#### Scenario: Status filtering

- **WHEN** the organizer or admin selects a status filter tab (All, Published, Draft, Cancelled, Ended)
- **THEN** the visible rows SHALL be limited to concerts matching the selected status

### Requirement: Concert status presentation

The web app SHALL map each backend concert status to a stable badge label and style, covering PUBLISHED, DRAFT, ENDED, and CANCELLED.

#### Scenario: Known status maps to a badge

- **WHEN** a concert has status PUBLISHED, DRAFT, ENDED, or CANCELLED
- **THEN** the UI SHALL render the corresponding label and badge style for that status

#### Scenario: Unknown status is handled safely

- **WHEN** a concert status does not match a known value
- **THEN** the mapping SHALL fall back to a neutral default rather than throwing

### Requirement: Concert detail panel and edit route

The web app SHALL present concert detail in a panel beside the `/concerts` list when a concert is selected, showing its event information (venue, city, schedule), current status, and a setup/inventory summary. Editing metadata SHALL open a dedicated `/concerts/:id/edit` route. Both organizers and admins use the same detail panel and edit route. Ticket-type and seating-map editor surfaces are out of scope for this change and SHALL NOT be rendered.

#### Scenario: Selecting a concert opens the detail panel

- **WHEN** the organizer or admin selects a concert from the list
- **THEN** the app SHALL show that concert's detail panel beside the list with its event info (venue, city, schedule), current status, and setup/inventory summary
- **AND** the panel SHALL offer an Edit action, a Publish action when the concert is DRAFT, and a Cancel action when the concert is not already ENDED or CANCELLED

#### Scenario: Editing a concert opens the edit route

- **WHEN** the user activates Edit from the detail panel
- **THEN** the app SHALL navigate to `/concerts/:id/edit` and render the editable metadata form

#### Scenario: Admin cannot create concerts

- **WHEN** an admin views the concert list or a concert's detail panel
- **THEN** the UI SHALL NOT render a create-concert action

#### Scenario: Ticket type and seating map editors are deferred

- **WHEN** viewing a concert's detail panel or edit route
- **THEN** the UI SHALL NOT render ticket-type or seating-map editor surfaces (deferred to separate changes)

### Requirement: Concert create and edit

The web app SHALL provide forms to create and edit a concert with fields slug, title, artistName, venueName, venueAddress, city, startsAt, endsAt, and description, validated before submission. Slug SHALL be editable. Concert creation SHALL be organizer-only. Concert editing SHALL be available to both organizers and admins, submitted through their respective role-appropriate endpoints (`/organizer/concerts/:id` or `/admin/concerts/:id`).

#### Scenario: Valid create submission

- **WHEN** the organizer submits the create form with all required fields valid
- **THEN** the app SHALL POST to the organizer concerts endpoint and refresh the concert list on success
- **AND** this action SHALL NOT be available to admin users

#### Scenario: Invalid form is rejected client-side

- **WHEN** required fields are missing, the slug is not URL-safe, or endsAt is not after startsAt
- **THEN** the form SHALL surface field-level validation errors and SHALL NOT submit

#### Scenario: Edit submission

- **WHEN** the organizer or admin saves edits, including a changed slug, to an existing concert
- **THEN** the app SHALL PATCH the role-appropriate concerts endpoint (`/organizer/concerts/:id` or `/admin/concerts/:id`) and refresh the affected concert data on success

### Requirement: Role-aware shell navigation

The web app SHALL expose only the global sidebar items that belong to the active role. Organizer sidebar SHALL contain Concerts and Settings. Admin sidebar SHALL contain Dashboard, Concerts, Staff, and Settings. Seating Map SHALL NOT appear as a global sidebar item.

#### Scenario: Organizer lands on concerts

- **WHEN** an authenticated organizer opens the root route
- **THEN** the app SHALL redirect them to `/concerts`

#### Scenario: Admin lands on dashboard

- **WHEN** an authenticated admin opens the root route
- **THEN** the app SHALL redirect them to `/dashboard`

### Requirement: Concert lifecycle actions

The web app SHALL let the organizer or admin publish and cancel a concert through the backend and reflect the resulting status.

#### Scenario: Publish a draft concert

- **WHEN** the organizer or admin publishes a DRAFT concert
- **THEN** the app SHALL POST to the role-appropriate publish endpoint and update the concert's status to PUBLISHED on success

#### Scenario: Cancel a concert

- **WHEN** the organizer or admin cancels a concert
- **THEN** the app SHALL POST to the role-appropriate cancel endpoint and update the concert's status to CANCELLED on success

### Requirement: Concert query cache keys

The web app SHALL use stable, namespaced, session-scoped TanStack Query keys for the concert list and concert detail so that mutations can invalidate the correct cached data without reusing admin data for organizer sessions or one organizer's data for another organizer. The session scope SHALL include the effective role and `session.sub`.

#### Scenario: List and detail keys are distinct and stable

- **WHEN** building query keys for the concert list and for a concert by id
- **THEN** the list key and the detail-by-id key SHALL be deterministic and distinguishable, the keys SHALL incorporate the active session scope, and the detail key SHALL incorporate the concert id
