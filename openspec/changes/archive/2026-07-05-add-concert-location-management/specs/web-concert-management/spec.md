## ADDED Requirements

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
