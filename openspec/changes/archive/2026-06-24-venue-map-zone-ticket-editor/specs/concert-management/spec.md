## MODIFIED Requirements

### Requirement: Ticket type configuration
The system SHALL allow organizers and admins to configure ticket type code, name, description, price, quantity,
sale window, maximum quantity per user, status, and seating-zone mappings per concert. Ticket-type
validation SHALL preserve domain-level validation errors inside application use-cases and SHALL map
those errors to HTTP validation or conflict responses at the HTTP adapter boundary.

#### Scenario: Organizer configures SVIP ticket type
- **WHEN** an organizer creates an SVIP ticket type with quantity 200 and max 2 per user
- **THEN** the system SHALL persist those constraints and use them during checkout

#### Scenario: Admin configures ticket type
- **WHEN** an admin creates or updates a ticket type for any concert
- **THEN** the system SHALL persist the ticket type using the same validation rules as organizer ticket-type configuration

#### Scenario: Organizer configures custom ticket type
- **WHEN** an organizer creates a custom ticket type such as Diamond, Gold, Standing, or Couple for a concert
- **THEN** the system SHALL persist the ticket type for that concert without requiring the code or name to be one of SVIP, VIP, GA, CAT1, or CAT2

#### Scenario: Invalid ticket type is rejected — negative price
- **WHEN** an organizer or admin submits a ticket type with a negative price
- **THEN** the system SHALL reject the configuration with a validation error identifying the price field

#### Scenario: Invalid ticket type is rejected — invalid quantity
- **WHEN** an organizer or admin submits a ticket type with a zero or negative quantity
- **THEN** the system SHALL reject the configuration with a validation error identifying the quantity field

#### Scenario: Invalid ticket type is rejected — invalid sale window
- **WHEN** an organizer or admin submits a ticket type where sale end time is not after sale start time
- **THEN** the system SHALL reject the configuration with a validation error identifying the sale window

#### Scenario: Duplicate ticket type code is rejected within a concert
- **WHEN** an organizer or admin creates two ticket types with the same code for the same concert
- **THEN** the system SHALL reject the duplicate code with a conflict error

#### Scenario: Same ticket type code is allowed across concerts
- **WHEN** different concerts use the same ticket type code
- **THEN** the system SHALL allow the code because ticket type codes are unique only within each concert

#### Scenario: Organizer updates ticket type
- **WHEN** an organizer submits updated fields for a ticket type on a concert they own
- **THEN** the system SHALL apply the update; if the updated code conflicts with another ticket type code in the same concert the system SHALL reject with a conflict error

#### Scenario: Admin updates ticket type
- **WHEN** an admin submits updated fields for a ticket type on any concert
- **THEN** the system SHALL apply the update; if the updated code conflicts with another ticket type code in the same concert the system SHALL reject with a conflict error

#### Scenario: Organizer archives ticket type
- **WHEN** an organizer archives a ticket type on a concert they own and no sold or reserved tickets exist for that type
- **THEN** the system SHALL set the ticket type status to ARCHIVED rather than removing the record, preserving order history

#### Scenario: Admin archives ticket type
- **WHEN** an admin archives a ticket type on any concert and no sold or reserved tickets exist for that type
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

### Requirement: Seating map zone mapping
The system SHALL allow organizers and admins to define seating zones from uploaded SVG element IDs and map ticket types to those zones.

#### Scenario: Organizer defines seating zones from SVG elements
- **WHEN** an organizer uploads a seating map SVG with identifiable element IDs for a concert they own
- **THEN** the system SHALL allow the organizer to save selected SVG element IDs as seating zones with labels, colors, display order, and status for that concert

#### Scenario: Admin defines seating zones from SVG elements
- **WHEN** an admin uploads a seating map SVG with identifiable element IDs for any concert
- **THEN** the system SHALL allow the admin to save selected SVG element IDs as seating zones with labels, colors, display order, and status for that concert

#### Scenario: Unsafe seating map SVG is rejected
- **WHEN** an organizer or admin uploads a seating map SVG containing scripts, event handlers, external references, unsupported content, or file size beyond the configured limit
- **THEN** the system SHALL reject the SVG before storing it as an active seating map asset

#### Scenario: Seating zone color falls back to default
- **WHEN** an organizer or admin defines a seating zone without a custom color
- **THEN** the system SHALL allow the zone and provide enough data for the frontend to render it with a default color

#### Scenario: Organizer maps ticket type to multiple zones
- **WHEN** an organizer configures a ticket type that covers more than one seating area
- **THEN** the system SHALL allow that ticket type to be mapped to multiple seating zones from the same concert

#### Scenario: Admin maps ticket type to multiple zones
- **WHEN** an admin configures a ticket type that covers more than one seating area
- **THEN** the system SHALL allow that ticket type to be mapped to multiple seating zones from the same concert

#### Scenario: Organizer maps multiple ticket types to one zone
- **WHEN** an organizer offers multiple ticket types for the same seating area
- **THEN** the system SHALL allow multiple ticket types from the same concert to map to the same seating zone

#### Scenario: Admin maps multiple ticket types to one zone
- **WHEN** an admin offers multiple ticket types for the same seating area
- **THEN** the system SHALL allow multiple ticket types from the same concert to map to the same seating zone

#### Scenario: Cross-concert zone mapping is rejected
- **WHEN** an organizer or admin attempts to map a ticket type from one concert to a seating zone from another concert
- **THEN** the system SHALL reject the mapping

## ADDED Requirements

### Requirement: Seating map authoring read endpoints
The system SHALL expose read-only protected admin and organizer endpoints for loading seating-map authoring state without changing existing write behavior. Admin endpoints SHALL allow reads for any concert. Organizer endpoints SHALL allow reads only for concerts owned by the organizer.

#### Scenario: Admin reads seating map metadata
- **WHEN** an authenticated admin requests `GET /admin/concerts/:id/seating-map` for an existing concert
- **THEN** the system SHALL return the current seating map `assetId` and extracted `svgElementIds`

#### Scenario: Organizer reads owned seating map metadata
- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id/seating-map` for a concert they own
- **THEN** the system SHALL return the current seating map `assetId` and extracted `svgElementIds`

#### Scenario: Missing seating map returns empty metadata
- **WHEN** an authorized admin or organizer reads seating map metadata for a concert without an uploaded seating map
- **THEN** the system SHALL return a safe empty authoring response with no `assetId` and an empty `svgElementIds` list

#### Scenario: Admin reads seating zones
- **WHEN** an authenticated admin requests `GET /admin/concerts/:id/seating-zones` for an existing concert
- **THEN** the system SHALL return that concert's seating zones with `id`, `svgElementId`, `label`, `color`, `displayOrder`, and `status`

#### Scenario: Organizer reads owned seating zones
- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id/seating-zones` for a concert they own
- **THEN** the system SHALL return that concert's seating zones with `id`, `svgElementId`, `label`, `color`, `displayOrder`, and `status`

#### Scenario: Admin reads ticket types with mapped zones
- **WHEN** an authenticated admin requests `GET /admin/concerts/:id/ticket-types` for an existing concert
- **THEN** the system SHALL return that concert's ticket types with code, name, description, `priceVnd`, total quantity, sale window, max per user, status, and `mappedZones`

#### Scenario: Organizer reads owned ticket types with mapped zones
- **WHEN** an authenticated organizer requests `GET /organizer/concerts/:id/ticket-types` for a concert they own
- **THEN** the system SHALL return that concert's ticket types with code, name, description, `priceVnd`, total quantity, sale window, max per user, status, and `mappedZones`

#### Scenario: Organizer cannot read another organizer's authoring state
- **WHEN** an authenticated organizer requests any seating-map authoring read endpoint for a concert owned by another organizer
- **THEN** the system SHALL reject the request as forbidden

#### Scenario: Non-existent concert authoring read returns not found
- **WHEN** an authenticated admin or organizer requests any seating-map authoring read endpoint for a concert id that does not exist
- **THEN** the system SHALL respond with a not-found error
