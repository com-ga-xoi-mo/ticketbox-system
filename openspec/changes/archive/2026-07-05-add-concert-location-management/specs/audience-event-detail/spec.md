## ADDED Requirements

### Requirement: Audience map uses persisted concert coordinates
The audience event detail page SHALL display an OpenStreetMap-backed Leaflet map with a marker at the concert's persisted `latitude` and `longitude` when both fields are non-null in the public concert detail response. When either coordinate is null, the map SHALL NOT be rendered and no fallback coordinate SHALL be assumed.

#### Scenario: Concert has persisted coordinates — map is shown
- **WHEN** the public concert detail response includes non-null `latitude` and `longitude`
- **THEN** the event detail page SHALL render the Leaflet map with a marker at those coordinates
- **AND** the OpenStreetMap tile attribution SHALL be visible

#### Scenario: Concert has no coordinates — map is hidden
- **WHEN** the public concert detail response has `latitude: null` or `longitude: null`
- **THEN** the event detail page SHALL NOT render a map
- **AND** `venueName`, `venueAddress`, and `city` SHALL still be displayed

#### Scenario: Map button is hidden when coordinates are absent
- **WHEN** the public concert detail response has no coordinates
- **THEN** any "View on map" or "Xem bản đồ" button or link SHALL be hidden or disabled
- **AND** no modal containing an empty or incorrectly positioned map SHALL be shown

#### Scenario: No HCMC fallback is used
- **WHEN** the concert has no saved coordinates
- **THEN** the system SHALL NOT display a map centered on Ho Chi Minh City or any other default location

#### Scenario: Hard-coded venue-coordinates lookup is removed
- **WHEN** the audience event detail page renders for any concert
- **THEN** coordinate resolution SHALL come only from the API response `latitude` and `longitude` fields
- **AND** no venue name matching or hard-coded coordinate table SHALL be used

#### Scenario: OSM attribution remains visible on the map
- **WHEN** the map is rendered for a concert with coordinates
- **THEN** the OpenStreetMap attribution text SHALL be visible and unobstructed per OSM tile usage policy

#### Scenario: Audience map uses the canonical OSM tile endpoint
- **WHEN** the audience map requests raster tiles
- **THEN** it SHALL use `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- **AND** the app SHALL preserve normal browser Referer and cache behavior
- **AND** it SHALL NOT prefetch or provide offline tile downloads
