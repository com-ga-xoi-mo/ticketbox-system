## MODIFIED Requirements

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
