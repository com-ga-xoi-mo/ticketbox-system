## MODIFIED Requirements

### Requirement: Concert detail panel and edit route

The web app SHALL present concert detail in a shared panel beside the role-specific concert list when a concert is selected, showing its event information (venue, city, schedule), current status, and a setup/inventory summary. Editing metadata SHALL open the role-specific edit route: `/organizer/concerts/:id/edit` for organizers and `/admin/concerts/:id/edit` for admins. Seating-map and ticket-type authoring SHALL be available through the role-specific Venue Maps workflow rather than embedded in the metadata edit route. Both roles SHALL use the same shared detail panel component.

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

#### Scenario: Venue map authoring is linked from concert context

- **WHEN** an organizer or admin needs to configure seating zones, ticket types, or mappings for a concert
- **THEN** the app SHALL provide navigation to that concert's role-specific Venue Maps editor

#### Scenario: Admin cannot create concerts

- **WHEN** an admin views the concert list or a concert's detail panel
- **THEN** the UI SHALL NOT render a create-concert action

#### Scenario: Metadata edit route does not embed venue map editor

- **WHEN** viewing a concert's metadata edit route
- **THEN** the UI SHALL NOT render the full ticket-type or seating-map editor inside that metadata form

### Requirement: Role-aware shell navigation

The web app SHALL expose only the global sidebar items that belong to the active role. Organizer sidebar SHALL contain Concerts, Venue Maps, and Settings, with Concerts linking to `/organizer/concerts` and Venue Maps linking to `/organizer/venue-maps`. Admin sidebar SHALL contain Dashboard, Concerts, Venue Maps, Staff, and Settings, with Dashboard linking to `/admin/dashboard`, Concerts linking to `/admin/concerts`, and Venue Maps linking to `/admin/venue-maps`.

#### Scenario: Organizer lands on concerts

- **WHEN** an authenticated organizer opens the root route
- **THEN** the app SHALL redirect them to `/organizer/concerts`

#### Scenario: Admin lands on dashboard

- **WHEN** an authenticated admin opens the root route
- **THEN** the app SHALL redirect them to `/admin/dashboard`

#### Scenario: Organizer can navigate to Venue Maps

- **WHEN** the current user's role is `ORGANIZER`
- **THEN** the sidebar SHALL show a Venue Maps item linking to `/organizer/venue-maps`

#### Scenario: Admin can navigate to Venue Maps

- **WHEN** the current user's role is `ADMIN`
- **THEN** the sidebar SHALL show a Venue Maps item linking to `/admin/venue-maps`

## ADDED Requirements

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
