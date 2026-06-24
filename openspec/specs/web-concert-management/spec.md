# web-concert-management Specification

## Purpose
TBD

## Requirements

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

### Requirement: Concert status presentation

The web app SHALL map each backend concert status to a stable badge label and style, covering PUBLISHED, DRAFT, ENDED, and CANCELLED.

#### Scenario: Known status maps to a badge

- **WHEN** a concert has status PUBLISHED, DRAFT, ENDED, or CANCELLED
- **THEN** the UI SHALL render the corresponding label and badge style for that status

#### Scenario: Unknown status is handled safely

- **WHEN** a concert status does not match a known value
- **THEN** the mapping SHALL fall back to a neutral default rather than throwing

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

### Requirement: Concert lifecycle actions

The web app SHALL let the organizer or admin publish and cancel a concert through the backend and reflect the resulting status.

#### Scenario: Publish a draft concert

- **WHEN** the organizer or admin publishes a DRAFT concert
- **THEN** the app SHALL POST to the role-appropriate publish endpoint and update the concert's status to PUBLISHED on success

#### Scenario: Cancel a concert

- **WHEN** the organizer or admin cancels a concert
- **THEN** the app SHALL POST to the role-appropriate cancel endpoint and update the concert's status to CANCELLED on success

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

### Requirement: Venue Maps list and editor workflow
The web app SHALL provide role-prefixed Venue Maps screens for admins and organizers. The list screen SHALL show concerts visible to the current role as a summary list and SHALL allow selecting a concert to open its venue-map editor. Each concert row SHALL display event info (title, artist, venue/city, schedule), a status badge, the ticket-type count (`ticketTypesCount`), and the seating-map authoring status (`seatingMapConfigured` plus `seatingZonesCount`). The list SHALL source these fields from the existing role-appropriate concert list endpoint (`GET /admin/concerts` or `GET /organizer/concerts`) without requiring a new backend field; the row metric is the number of ticket types, not the summed ticket quantity. The editor screen SHALL load the selected concert plus seating-map metadata, seating zones, and ticket types with mapped zones from the role-appropriate endpoints.

#### Scenario: Organizer opens Venue Maps list

- **WHEN** an authenticated organizer navigates to `/organizer/venue-maps`
- **THEN** the page SHALL list the organizer's concerts and allow selecting a concert for venue-map authoring

#### Scenario: Admin opens Venue Maps list

- **WHEN** an authenticated admin navigates to `/admin/venue-maps`
- **THEN** the page SHALL list all concerts and allow selecting a concert for venue-map authoring

#### Scenario: Each concert row shows an authoring summary

- **WHEN** the Venue Maps list renders a concert
- **THEN** the row SHALL show the concert's event info, status badge, ticket-type count from `ticketTypesCount`, and seating-map status derived from `seatingMapConfigured` and `seatingZonesCount`
- **AND** the row SHALL be selectable to open that concert's role-specific Venue Maps editor

#### Scenario: Organizer opens editor

- **WHEN** an authenticated organizer navigates to `/organizer/venue-maps/:id`
- **THEN** the app SHALL load the selected concert, `GET /organizer/concerts/:id/seating-map`, `GET /organizer/concerts/:id/seating-zones`, and `GET /organizer/concerts/:id/ticket-types`

#### Scenario: Admin opens editor

- **WHEN** an authenticated admin navigates to `/admin/venue-maps/:id`
- **THEN** the app SHALL load the selected concert, `GET /admin/concerts/:id/seating-map`, `GET /admin/concerts/:id/seating-zones`, and `GET /admin/concerts/:id/ticket-types`

#### Scenario: Existing authoring state is restored

- **WHEN** the editor loads a concert that already has an uploaded seating map, seating zones, ticket types, and mappings
- **THEN** the SVG, zones, ticket types, and N:N zone mappings SHALL be displayed without requiring additional user input

### Requirement: Venue map SVG zone editor
The editor SHALL render the uploaded SVG from `GET /assets/:id` and allow interactive zone selection based on backend-extracted SVG element IDs.

#### Scenario: Upload seating map SVG

- **WHEN** a user uploads a valid SVG file from a DRAFT concert editor
- **THEN** the app SHALL submit it to the role-appropriate `POST .../seating-map` endpoint and refresh seating-map metadata after success

#### Scenario: Re-upload warning

- **WHEN** a concert already has a seating map and the user starts a new upload
- **THEN** the app SHALL warn: "Upload map mới sẽ vô hiệu hoá các zone/mapping hiện có"

#### Scenario: Select SVG element as zone

- **WHEN** the user hovers or clicks an SVG element whose id is included in `svgElementIds`
- **THEN** the editor SHALL visually highlight that SVG element and synchronize selection with the zone list

#### Scenario: Save seating zones

- **WHEN** the user saves zone definitions for a DRAFT concert
- **THEN** the app SHALL call the role-appropriate `PATCH .../seating-zones` endpoint with zones containing `svgElementId`, `label`, optional `color`, `displayOrder`, and optional `status`

#### Scenario: Zone references missing SVG element

- **WHEN** a saved zone references an SVG element id that is not present in the current uploaded SVG metadata
- **THEN** the editor SHALL show a validation warning for that zone and prevent saving invalid zone data

#### Scenario: Zone has no ticket coverage

- **WHEN** a seating zone is not mapped by any ticket type
- **THEN** the zone list SHALL show an `Unmapped` badge for that zone

### Requirement: Ticket type and zone mapping editor
The editor SHALL allow ticket types to be created, updated, archived, and mapped to seating zones using the existing role-appropriate backend endpoints. Ticket type pricing SHALL use VND via `priceVnd`, and ticket-to-zone mapping SHALL be N:N.

#### Scenario: Create ticket type with full backend fields

- **WHEN** the user creates a ticket type for a DRAFT concert
- **THEN** the form SHALL capture `code`, `name`, `description`, `priceVnd`, `totalQuantity`, `saleStartsAt`, `saleEndsAt`, and `maxPerUser`
- **AND** the app SHALL submit those fields to the role-appropriate `POST .../ticket-types` endpoint

#### Scenario: Edit ticket type

- **WHEN** the user edits a ticket type for a DRAFT concert
- **THEN** the app SHALL submit changed fields to the role-appropriate `PATCH .../ticket-types/:typeId` endpoint

#### Scenario: Archive ticket type

- **WHEN** the user archives a ticket type for a DRAFT concert
- **THEN** the app SHALL call the role-appropriate `PATCH .../ticket-types/:typeId/archive` endpoint

#### Scenario: Map ticket type to multiple zones

- **WHEN** the user assigns several seating zones to one ticket type
- **THEN** the app SHALL call the role-appropriate `PUT .../ticket-types/:typeId/zone-mappings` endpoint with `seatingZoneIds`

#### Scenario: Zone can belong to multiple ticket types

- **WHEN** the same seating zone is assigned to multiple ticket types
- **THEN** the editor SHALL display all mappings without treating them as duplicates or conflicts

#### Scenario: Ticket type has no mapped zone

- **WHEN** a ticket type has an empty `mappedZones` list
- **THEN** the editor SHALL show a clear unmapped or empty mapping state for that ticket type

### Requirement: Venue map editor editability
The venue-map editor SHALL be editable only for DRAFT concerts. For PUBLISHED, CANCELLED, or ENDED concerts, the editor SHALL show current configuration in read-only mode and explain why editing is disabled.

#### Scenario: Draft concert is editable

- **WHEN** the editor is opened for a concert with status `DRAFT`
- **THEN** upload, zone save, ticket type mutation, archive, and zone mapping controls SHALL be enabled according to normal validation state

#### Scenario: Published concert is read-only

- **WHEN** the editor is opened for a concert with status `PUBLISHED`
- **THEN** the app SHALL display the seating map, zones, ticket types, and mappings without enabling write controls
- **AND** the app SHALL show a banner explaining that only draft concerts can be edited

#### Scenario: Cancelled or ended concert is read-only

- **WHEN** the editor is opened for a concert with status `CANCELLED` or `ENDED`
- **THEN** the app SHALL display the existing authoring state without enabling write controls
- **AND** the app SHALL show a banner explaining that only draft concerts can be edited

### Requirement: Venue map editor visual design
The venue-map editor SHALL follow the Stitch "Ticket Mapping" screen from "TicketBox Admin Portal Design" for layout, section ordering, and labels, while using the app's Midnight Venue design system and existing shared UI primitives.

#### Scenario: Editor uses existing design system

- **WHEN** the Venue Maps editor is rendered
- **THEN** it SHALL use existing shared UI primitives where available and SHALL NOT create duplicate button, table, dialog, tab, input, textarea, badge, or pagination primitives

#### Scenario: Editor uses VND and technical labeling

- **WHEN** ticket price or technical identifiers are displayed
- **THEN** prices SHALL be shown as VND and technical labels such as SVG element ids SHALL use the app's technical label treatment

#### Scenario: Empty states are visible

- **WHEN** no SVG, no zones, no ticket types, or no mappings exist
- **THEN** the editor SHALL show clear empty states for the missing authoring data
