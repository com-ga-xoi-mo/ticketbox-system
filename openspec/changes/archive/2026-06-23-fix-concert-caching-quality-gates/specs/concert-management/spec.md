## MODIFIED Requirements

### Requirement: Ticket type configuration

The system SHALL allow organizers to configure ticket type code, name, description, price, quantity,
sale window, maximum quantity per user, status, and seating-zone mappings per concert. Ticket-type
validation SHALL preserve domain-level validation errors inside application use-cases and SHALL map
those errors to HTTP validation or conflict responses at the HTTP adapter boundary.

#### Scenario: Organizer configures SVIP ticket type

- **WHEN** an organizer creates an SVIP ticket type with quantity 200 and max 2 per user
- **THEN** the system SHALL persist those constraints and use them during checkout

#### Scenario: Organizer configures custom ticket type

- **WHEN** an organizer creates a custom ticket type such as Diamond, Gold, Standing, or Couple for a concert
- **THEN** the system SHALL persist the ticket type for that concert without requiring the code or name to be one of SVIP, VIP, GA, CAT1, or CAT2

#### Scenario: Invalid ticket type is rejected — negative price

- **WHEN** an organizer submits a ticket type with a negative price
- **THEN** the system SHALL reject the configuration with a validation error identifying the price field

#### Scenario: Invalid ticket type is rejected — invalid quantity

- **WHEN** an organizer submits a ticket type with a zero or negative quantity
- **THEN** the system SHALL reject the configuration with a validation error identifying the quantity field

#### Scenario: Invalid ticket type is rejected — invalid sale window

- **WHEN** an organizer submits a ticket type where sale end time is not after sale start time
- **THEN** the system SHALL reject the configuration with a validation error identifying the sale window

#### Scenario: Duplicate ticket type code is rejected within a concert

- **WHEN** an organizer creates two ticket types with the same code for the same concert
- **THEN** the system SHALL reject the duplicate code with a conflict error

#### Scenario: Same ticket type code is allowed across concerts

- **WHEN** different concerts use the same ticket type code
- **THEN** the system SHALL allow the code because ticket type codes are unique only within each concert

#### Scenario: Organizer updates ticket type

- **WHEN** an organizer submits updated fields for a ticket type on a concert they own
- **THEN** the system SHALL apply the update; if the updated code conflicts with another ticket type code in the same concert the system SHALL reject with a conflict error

#### Scenario: Organizer archives ticket type

- **WHEN** an organizer archives a ticket type on a concert they own and no sold or reserved tickets exist for that type
- **THEN** the system SHALL set the ticket type status to ARCHIVED rather than removing the record, preserving order history

#### Scenario: Application use-case exposes domain validation errors

- **WHEN** a ticket-type application use-case rejects invalid price, invalid quantity, invalid sale
  period, duplicate code, or archive-with-sold-or-reserved-quantity input
- **THEN** the application layer SHALL expose the corresponding domain error without converting it
  to a Nest HTTP exception

#### Scenario: HTTP adapter maps ticket-type domain errors

- **WHEN** a protected ticket-type HTTP endpoint receives input that the application layer rejects
  with a ticket-type domain validation or conflict error
- **THEN** the HTTP adapter SHALL map the domain error to the appropriate validation or conflict
  HTTP response
