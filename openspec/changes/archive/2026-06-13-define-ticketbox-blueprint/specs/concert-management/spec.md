## ADDED Requirements

### Requirement: Public concert catalog
The system SHALL show upcoming concerts with artist, venue, schedule, poster, seating zones, ticket types, prices, sale windows, and near-real-time availability.

#### Scenario: Audience views concert list
- **WHEN** an audience user opens the public concert list
- **THEN** the system SHALL return upcoming published concerts with summary metadata

#### Scenario: Audience views concert detail
- **WHEN** an audience user opens a concert detail page
- **THEN** the system SHALL return concert detail, seating map zones, ticket types, and availability snapshots

### Requirement: Organizer concert administration
The system SHALL allow authorized organizers to create, update, publish, and cancel concerts.

#### Scenario: Organizer creates concert
- **WHEN** an organizer submits valid concert information
- **THEN** the system SHALL create a draft concert associated with that organizer

#### Scenario: Organizer cancels concert
- **WHEN** an organizer cancels a published concert
- **THEN** the system SHALL mark the concert as cancelled and prevent new ticket purchases

### Requirement: Ticket type configuration
The system SHALL allow organizers to configure ticket type name, zone, price, quantity, sale window, and maximum quantity per user.

#### Scenario: Organizer configures SVIP ticket type
- **WHEN** an organizer creates an SVIP ticket type with quantity 200 and max 2 per user
- **THEN** the system SHALL persist those constraints and use them during checkout

#### Scenario: Invalid ticket type is rejected
- **WHEN** an organizer submits a ticket type with negative price or invalid sale window
- **THEN** the system SHALL reject the configuration

