# concert-management Specification

## Purpose
TBD - created by archiving change define-ticketbox-blueprint. Update Purpose after archive.
## Requirements
### Requirement: Public concert catalog
The system SHALL show upcoming concerts with artist, venue, schedule, poster, seating map asset, seating zones, ticket types, prices, sale windows, ticket-to-zone mappings, and near-real-time availability.

#### Scenario: Audience views concert list
- **WHEN** an audience user opens the public concert list
- **THEN** the system SHALL return only upcoming published concerts with summary metadata ordered by start time

#### Scenario: Audience cannot see unpublished or unavailable concerts in public list
- **WHEN** the public concert list contains draft, cancelled, ended, or past concerts in the database
- **THEN** the system SHALL exclude those concerts from the public catalog response

#### Scenario: Audience views concert detail
- **WHEN** an audience user opens a published upcoming concert detail page
- **THEN** the system SHALL return concert detail, poster asset metadata, seating map asset metadata, seating zones with SVG element IDs, ticket types, ticket-to-zone mappings, and availability snapshots

#### Scenario: Audience cannot view non-public concert detail
- **WHEN** an audience user requests a draft, cancelled, ended, or past concert detail page
- **THEN** the system SHALL return a not-found response without exposing private administration data

#### Scenario: Audience selects a seating zone
- **WHEN** an audience user selects a rendered seating zone from the concert detail seating map
- **THEN** the system SHALL provide enough catalog data for the frontend to show the ticket types, prices, sale windows, and availability mapped to that zone

#### Scenario: Availability is calculated from persisted ticket quantities
- **WHEN** the public catalog returns a ticket type availability snapshot
- **THEN** the system SHALL calculate available quantity from persisted ticket type totals, reserved quantity, and sold quantity without creating reservations or orders

#### Scenario: Ticket type mapping stays within the same concert
- **WHEN** the public concert detail response includes ticket-to-zone mappings
- **THEN** every mapped ticket type and seating zone SHALL belong to the requested concert

### Requirement: Organizer concert administration
The system SHALL allow authorized organizers to create, update, publish, and cancel concerts, including assigning poster and seating map assets.

#### Scenario: Organizer creates concert
- **WHEN** an organizer submits valid concert information
- **THEN** the system SHALL create a draft concert associated with that organizer

#### Scenario: Organizer cancels concert
- **WHEN** an organizer cancels a published concert
- **THEN** the system SHALL mark the concert as cancelled and prevent new ticket purchases

#### Scenario: Organizer uploads seating map asset
- **WHEN** an organizer uploads a valid SVG seating map for a concert they manage
- **THEN** the system SHALL store the SVG as an asset and associate it with the concert as its seating map asset

### Requirement: Ticket type configuration
The system SHALL allow organizers to configure ticket type code, name, description, price, quantity, sale window, maximum quantity per user, status, and seating-zone mappings per concert.

#### Scenario: Organizer configures SVIP ticket type
- **WHEN** an organizer creates an SVIP ticket type with quantity 200 and max 2 per user
- **THEN** the system SHALL persist those constraints and use them during checkout

#### Scenario: Organizer configures custom ticket type
- **WHEN** an organizer creates a custom ticket type such as Diamond, Gold, Standing, or Couple for a concert
- **THEN** the system SHALL persist the ticket type for that concert without requiring the code or name to be one of SVIP, VIP, GA, CAT1, or CAT2

#### Scenario: Invalid ticket type is rejected
- **WHEN** an organizer submits a ticket type with negative price or invalid sale window
- **THEN** the system SHALL reject the configuration

#### Scenario: Duplicate ticket type code is rejected within a concert
- **WHEN** an organizer creates two ticket types with the same code for the same concert
- **THEN** the system SHALL reject the duplicate code

#### Scenario: Same ticket type code is allowed across concerts
- **WHEN** different concerts use the same ticket type code
- **THEN** the system SHALL allow the code because ticket type codes are unique only within each concert

### Requirement: Seating map zone mapping
The system SHALL allow organizers to define seating zones from uploaded SVG element IDs and map ticket types to those zones.

#### Scenario: Organizer defines seating zones from SVG elements
- **WHEN** an organizer uploads a seating map SVG with identifiable element IDs for a concert
- **THEN** the system SHALL allow the organizer to save selected SVG element IDs as seating zones with labels, colors, display order, and status for that concert

#### Scenario: Unsafe seating map SVG is rejected
- **WHEN** an organizer uploads a seating map SVG containing scripts, event handlers, external references, unsupported content, or file size beyond the configured limit
- **THEN** the system SHALL reject the SVG before storing it as an active seating map asset

#### Scenario: Seating zone color falls back to default
- **WHEN** an organizer defines a seating zone without a custom color
- **THEN** the system SHALL allow the zone and provide enough data for the frontend to render it with a default color

#### Scenario: Organizer maps ticket type to multiple zones
- **WHEN** an organizer configures a ticket type that covers more than one seating area
- **THEN** the system SHALL allow that ticket type to be mapped to multiple seating zones from the same concert

#### Scenario: Organizer maps multiple ticket types to one zone
- **WHEN** an organizer offers multiple ticket types for the same seating area
- **THEN** the system SHALL allow multiple ticket types from the same concert to map to the same seating zone

#### Scenario: Cross-concert zone mapping is rejected
- **WHEN** an organizer attempts to map a ticket type from one concert to a seating zone from another concert
- **THEN** the system SHALL reject the mapping

### Requirement: Concert administration ownership enforcement
The system SHALL require organizer ownership or explicit admin authorization for protected concert administration actions, including concert details, ticket types, seating assets, revenue views, and check-in staff assignment management for the concert.

#### Scenario: Owner updates concert administration data
- **WHEN** an authenticated organizer updates administration data for a concert they created
- **THEN** the system SHALL authorize the action before applying validation and persistence

#### Scenario: Non-owner organizer cannot update concert administration data
- **WHEN** an authenticated organizer updates administration data for a concert created by another organizer
- **THEN** the system SHALL reject the request with an authorization error

#### Scenario: Admin can administer any concert through admin route
- **WHEN** an authenticated admin updates administration data for any concert through an admin-authorized route
- **THEN** the system SHALL authorize the action before applying validation and persistence
