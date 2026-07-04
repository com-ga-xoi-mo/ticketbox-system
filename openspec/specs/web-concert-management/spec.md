# web-concert-management Specification

## Purpose
Define role-scoped admin and organizer concert management screens, lifecycle actions, editing flows, and consistent asset rendering behavior.

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

#### Scenario: Management concert poster uses its public URL
- **WHEN** an admin or organizer concert response contains a poster with a non-empty `posterAsset.publicUrl`
- **THEN** the concert table, detail panel, and edit page SHALL render that `publicUrl` as the primary poster source
- **AND** the web app SHALL fall back to `GET /assets/:posterAssetId` only when `publicUrl` is absent

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

### Requirement: Marketplace concert authoring fields
The web management app SHALL let organizers and admins edit event type, ordered artists, banner, and SEO metadata while rendering featured placement only to admins.

#### Scenario: Organizer edits marketplace content
- **WHEN** an organizer opens create/edit for an owned editable concert
- **THEN** the form SHALL show event type, artist selection/order, banner, and SEO controls
- **AND** it SHALL NOT render featured or display-order controls

#### Scenario: Admin edits moderation fields
- **WHEN** an admin edits a concert
- **THEN** the form SHALL show featured toggle and non-negative display-order input in addition to marketplace content fields

#### Scenario: Event type is selected from canonical values
- **WHEN** a user edits event type
- **THEN** the UI SHALL offer only CONCERT, WORKSHOP, SPORT, MOVIE, THEATRE, and VOUCHER with understandable labels

#### Scenario: Management surfaces display marketplace metadata
- **WHEN** concert list or detail data contains event type, ordered artists, poster, or banner metadata
- **THEN** the management UI SHALL display the relevant values and resolve asset `publicUrl` before falling back to `/assets/:id`

### Requirement: Accessible ordered artist selector
The concert form SHALL provide an asynchronous multi-select over existing active artists and SHALL let users establish a deterministic primary and display order without creating artists inline.

#### Scenario: User searches active artists
- **WHEN** a user types a search query in the selector
- **THEN** the web app SHALL debounce `GET /public/artists?q=&limit=&offset=`, show matching active artists with avatar and name, and prevent duplicate selection
- **AND** it SHALL NOT introduce a separate organizer artist-search endpoint

#### Scenario: Selected artists are ordered accessibly
- **WHEN** multiple artists are selected
- **THEN** the UI SHALL label the first as primary and provide keyboard-operable move-up and move-down controls
- **AND** any drag-and-drop interaction SHALL not be the only ordering mechanism

#### Scenario: Existing inactive artist is visible
- **WHEN** management data contains an already-linked inactive artist
- **THEN** the selector SHALL display it with an inactive warning and allow retaining or removing it
- **AND** it SHALL not offer unrelated inactive artists as new selections

#### Scenario: Organizer cannot create artist inline
- **WHEN** an organizer search has no result
- **THEN** the selector SHALL show an empty result and SHALL NOT offer artist creation

#### Scenario: Link save fails after draft creation
- **WHEN** base concert creation succeeds but the artist replacement request fails
- **THEN** the UI SHALL keep the created DRAFT and current selections on the edit route, show a retryable error, and SHALL NOT publish the concert

#### Scenario: Primary artist owns the legacy name
- **WHEN** the form contains one or more selected artists
- **THEN** it SHALL derive the base `artistName` from the selected primary artist, save base metadata first, and replace artists second
- **AND** an edit form with linked artists SHALL render legacy `artistName` as derived/read-only so base metadata updates cannot overwrite synchronization

#### Scenario: Unlinked concert retains manual artist name
- **WHEN** a concert has no linked artists
- **THEN** the form SHALL keep manual `artistName` required and editable for compatibility
- **AND** clearing all links SHALL preserve the last legacy name and re-enable manual editing on the next unlinked edit

### Requirement: Banner and SEO management UI
The concert form SHALL provide banner upload/preview and nullable SEO fields with client validation compatible with backend contracts.

#### Scenario: Banner preview uses public URL
- **WHEN** a concert has banner metadata with a non-empty public URL
- **THEN** the form SHALL preview that URL and fall back to `/assets/:id` only if it is absent

#### Scenario: User replaces banner
- **WHEN** an authorized user selects a valid banner and confirms upload
- **THEN** the UI SHALL show upload progress, prevent duplicate submission, refresh concert data, and display the new preview

#### Scenario: Invalid SEO image URL is shown locally
- **WHEN** a user enters a non-empty SEO image URL that is not absolute HTTPS
- **THEN** the form SHALL show a field-level error and SHALL NOT submit until corrected or cleared

### Requirement: Admin artist catalog UI
The admin web app SHALL expose `/admin/artists` for paginated artist search, status filtering, create/edit, and avatar/poster management.

#### Scenario: Admin searches all artist statuses
- **WHEN** an admin opens the artist catalog and searches or filters by status
- **THEN** the UI SHALL request protected paginated data and display ACTIVE and INACTIVE artists with safe image metadata

#### Scenario: Admin creates or edits artist
- **WHEN** an admin submits valid slug, display name, optional bio, and status
- **THEN** the UI SHALL call the canonical admin contract, refresh affected queries, and show validation or conflict errors safely

#### Scenario: Admin uploads artist images
- **WHEN** an admin uploads a valid avatar or poster
- **THEN** the UI SHALL prevent duplicate upload, refresh artist data, and resolve the returned public URL

#### Scenario: Organizer cannot access artist catalog
- **WHEN** an organizer navigates to `/admin/artists` or calls admin artist APIs
- **THEN** existing route and backend role guards SHALL deny access

### Requirement: Marketplace management UI state safety
The web app SHALL preserve unsaved marketplace selections and avoid stale query data across role-specific mutations.

#### Scenario: Mutation invalidates role-scoped concert queries
- **WHEN** event type, SEO, artists, banner, or featured placement changes successfully
- **THEN** the web app SHALL invalidate the relevant role-specific list/detail queries without crossing admin and organizer cache namespaces

#### Scenario: Failed mutation preserves form state
- **WHEN** a marketplace mutation fails
- **THEN** the UI SHALL retain user-entered values, show a safe actionable error, and avoid displaying raw backend payloads

### Requirement: Venue location picker in concert forms
The web app SHALL include a `VenueLocationPicker` component integrated into the organizer concert create/edit forms and the admin concert edit form. The picker SHALL allow users to search for a venue address via the TicketBox `GET /locations/search` endpoint, display up to 5 results, show the selected location on an OpenStreetMap-backed Leaflet map, allow marker dragging to refine coordinates, and provide a clear-location action. The picker SHALL NOT trigger search requests on each keystroke; searching SHALL require explicit user action (pressing "Tìm địa điểm"). This change SHALL NOT expose an admin concert-create form.

#### Scenario: User searches for a venue address
- **WHEN** an organizer or admin types an address in the location search input and presses "Tìm địa điểm"
- **THEN** the form SHALL call `GET /locations/search?q=<address>` and display up to 5 results
- **AND** no request SHALL have been sent while the user was still typing

#### Scenario: Only one concurrent search is allowed
- **WHEN** the user presses "Tìm địa điểm" while a previous search request is in flight
- **THEN** the form SHALL NOT send a second request until the first completes

#### Scenario: User selects a search result
- **WHEN** the user selects a result from the search list
- **THEN** the `venueAddress` field SHALL be updated to the result's `displayName`
- **AND** `latitude` and `longitude` SHALL be updated to the result's coordinates
- **AND** the Leaflet map SHALL center and place a marker at those coordinates

#### Scenario: Selecting a result does not overwrite venueName
- **WHEN** the user selects a geocoding result
- **THEN** the `venueName` field SHALL retain its current value unchanged

#### Scenario: User drags or clicks the map marker to refine coordinates
- **WHEN** the user drags the marker or clicks on the map
- **THEN** `latitude` and `longitude` SHALL be updated to the new marker position
- **AND** `venueAddress` and `venueName` SHALL NOT be changed

#### Scenario: Edit form shows existing coordinates on load
- **WHEN** an organizer or admin opens the edit form for a concert that has saved coordinates
- **THEN** the Leaflet map SHALL render with a marker at the saved coordinates

#### Scenario: User clears location
- **WHEN** the user presses "Xóa vị trí"
- **THEN** `latitude` and `longitude` SHALL both be set to null
- **AND** the marker SHALL be removed from the map

#### Scenario: Provider error does not break the form
- **WHEN** the `GET /locations/search` call fails or the provider is unavailable
- **THEN** the form SHALL display an error state for the search area
- **AND** all other form fields SHALL retain their current values and remain editable

#### Scenario: Empty search results are shown gracefully
- **WHEN** the search returns an empty results array
- **THEN** the form SHALL display an "Không tìm thấy kết quả" message
- **AND** the form SHALL remain fully usable

#### Scenario: Geocoding attribution and privacy warning remain visible
- **WHEN** the location search UI or its results are displayed, including before a map marker exists
- **THEN** visible OpenStreetMap attribution SHALL be rendered near the geocoding surface
- **AND** the UI SHALL warn users not to submit personal or confidential material

#### Scenario: Empty picker viewport is not persisted as a location
- **WHEN** a create form opens without coordinates
- **THEN** the map MAY show a Vietnam overview viewport but SHALL show no marker
- **AND** no coordinates SHALL enter form state until the user selects a result or clicks the map

#### Scenario: Organizer owns the concert being edited
- **WHEN** an organizer accesses the location picker for a concert they own
- **THEN** the backend SHALL accept coordinate updates via the existing organizer ownership check
- **AND** the organizer SHALL NOT be able to set coordinates on a concert they do not own

#### Scenario: Admin uses location picker
- **WHEN** an admin accesses the location picker in the admin edit form
- **THEN** the admin SHALL be able to search, select, and save coordinates under existing admin concert permissions

#### Scenario: Leaflet map loads correctly under Vite build
- **WHEN** the `apps/web` bundle is built with Vite
- **THEN** Leaflet marker icons SHALL render correctly without 404 errors for icon assets
- **AND** tiles SHALL use `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with normal browser Referer and caching behavior
