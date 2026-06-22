## MODIFIED Requirements

### Requirement: Public concert catalog
The system SHALL show upcoming concerts with artist, venue, schedule, poster, seating map asset,
seating zones, ticket types, prices, sale windows, ticket-to-zone mappings, and availability.
Public catalog list and detail responses SHALL expose only upcoming published concerts. Public
detail responses SHALL compose current short-TTL availability into the returned response shape
before responding. Public list responses SHALL preserve their existing response shape, including
`availabilitySummary`, without requiring near-real-time availability freshness.

#### Scenario: Audience views concert list
- **WHEN** an audience user opens the public concert list
- **THEN** the system SHALL return only upcoming published concerts with summary metadata ordered by start time

#### Scenario: Audience concert list keeps availability summary shape
- **WHEN** an audience user opens the public concert list
- **THEN** each concert summary SHALL include `availabilitySummary`
- **AND** the system SHALL NOT require that summary to reflect the short-TTL availability window

#### Scenario: Audience cannot see unpublished or unavailable concerts in public list
- **WHEN** the public concert list contains draft, cancelled, ended, or past concerts in the database
- **THEN** the system SHALL exclude those concerts from the public catalog response

#### Scenario: Audience views concert detail
- **WHEN** an audience user opens a published upcoming concert detail page
- **THEN** the system SHALL return concert detail, poster asset metadata, seating map asset metadata, seating zones with SVG element IDs, ticket types, ticket-to-zone mappings, and availability snapshots

#### Scenario: Audience concert detail includes composed ticket availability
- **WHEN** an audience user opens a published upcoming concert detail page
- **THEN** each returned ticket type SHALL include `availableQuantity` composed from the current short-TTL availability data by ticket type id
- **AND** the detail response SHALL preserve the existing public response shape

#### Scenario: Missing availability item does not fail detail response
- **WHEN** a published concert detail response is composed and availability data is missing for one ticket type
- **THEN** the system SHALL return the detail response without failing
- **AND** the affected ticket type SHALL keep the static fallback availability value or another safe fallback value

#### Scenario: Audience cannot view non-public concert detail
- **WHEN** an audience user requests a draft, cancelled, ended, or past concert detail page
- **THEN** the system SHALL return a not-found response without exposing private administration data

#### Scenario: Audience cannot view non-public concert availability
- **WHEN** an audience user requests availability for a draft, cancelled, ended, or past concert slug
- **THEN** the system SHALL return a not-found response without exposing availability or private administration data

#### Scenario: Audience selects a seating zone
- **WHEN** an audience user selects a rendered seating zone from the concert detail seating map
- **THEN** the system SHALL provide enough catalog data for the frontend to show the ticket types, prices, sale windows, and availability mapped to that zone

#### Scenario: Availability is calculated from persisted ticket quantities
- **WHEN** the public catalog returns a ticket type availability snapshot
- **THEN** the system SHALL calculate available quantity from persisted ticket type totals, reserved quantity, and sold quantity without creating reservations or orders

#### Scenario: Ticket type mapping stays within the same concert
- **WHEN** the public concert detail response includes ticket-to-zone mappings
- **THEN** every mapped ticket type and seating zone SHALL belong to the requested concert

## ADDED Requirements

### Requirement: Public catalog asset URL contract
The system SHALL expose public catalog asset metadata for poster and seating map assets using URL
strings, not embedded binary content. The primary production delivery path SHALL be the asset
`publicUrl`; backend streaming through `GET /assets/:id` SHALL remain available only as a fallback,
debug, or development path.

#### Scenario: Public catalog response includes asset metadata
- **WHEN** a public concert list or detail response includes a poster or seating map asset
- **THEN** the asset metadata SHALL include at least `id`, `publicUrl`, `kind`, `status`, `originalName`, `contentType`, and `sizeBytes`
- **AND** the response SHALL NOT embed the binary image or SVG content in JSON

#### Scenario: Audience client can render production asset URL directly
- **WHEN** an audience client receives an asset with a non-empty `publicUrl`
- **THEN** the client contract SHALL treat that URL as the primary image or SVG source
- **AND** the client SHALL NOT need to call another API only to obtain an image URL

#### Scenario: Backend asset endpoint remains a fallback
- **WHEN** a client requests `GET /assets/:id` for an active servable poster or seating map asset
- **THEN** the system SHALL stream the asset bytes with the stored content type
- **AND** this endpoint SHALL NOT replace `publicUrl` as the primary production asset delivery path

#### Scenario: Poster upload persists public URL
- **WHEN** an organizer or admin uploads a valid poster image
- **THEN** the system SHALL store the object and persist the asset `publicUrl` returned by `ObjectStoragePort.getPublicUrl(storageKey)`

#### Scenario: Seating map upload persists public URL
- **WHEN** an organizer or admin uploads a valid seating map SVG
- **THEN** the system SHALL store the object and persist the asset `publicUrl` returned by `ObjectStoragePort.getPublicUrl(storageKey)`
